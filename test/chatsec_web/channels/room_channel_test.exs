defmodule ChatsecWeb.RoomChannelTest do
  use ChatsecWeb.ChannelCase
  alias ChatsecWeb.ChannelState

  setup do
    room_id = UUID.uuid4()
    {:ok, socket} = connect(ChatsecWeb.UserSocket, %{})
    %{room_id: room_id, socket: socket}
  end

  defp join_room(socket, room_id, username) do
    subscribe_and_join(socket, "room:" <> room_id, %{"username" => username})
  end

  test "a valid username can join", %{socket: socket, room_id: room_id} do
    assert {:ok, _reply, _socket} = join_room(socket, room_id, "Alice")
    assert ["Alice"] == ChannelState.list_users(room_id)
  end

  test "a third user is rejected once two have joined", %{room_id: room_id} do
    {:ok, alice_socket} = connect(ChatsecWeb.UserSocket, %{})
    {:ok, bob_socket} = connect(ChatsecWeb.UserSocket, %{})
    {:ok, charlie_socket} = connect(ChatsecWeb.UserSocket, %{})

    assert {:ok, _, _} = join_room(alice_socket, room_id, "Alice")
    assert {:ok, _, _} = join_room(bob_socket, room_id, "Bob")
    assert {:error, %{reason: "room_full"}} = join_room(charlie_socket, room_id, "Charlie")
  end

  test "usernames must be 1-32 letters/digits/spaces", %{room_id: room_id} do
    for bad_username <- ["", "   ", String.duplicate("a", 33), "<script>", "a\nb"] do
      {:ok, socket} = connect(ChatsecWeb.UserSocket, %{})
      assert {:error, %{reason: "invalid_username"}} = join_room(socket, room_id, bad_username)
    end
  end

  test "joining without a username doesn't crash the socket", %{room_id: room_id} do
    {:ok, socket} = connect(ChatsecWeb.UserSocket, %{})
    assert {:error, %{reason: "invalid_username"}} = subscribe_and_join(socket, "room:" <> room_id, %{})
  end

  test "publickey is broadcast to everyone in the room, including the sender", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    push(socket, "publickey", %{"publickey" => "abc123", "username" => "Alice"})

    assert_broadcast "publickey", %{"publickey" => "abc123", "username" => "Alice"}
  end

  test "new_msg is delivered to the other peer but not echoed back to the sender", %{room_id: room_id} do
    {:ok, _, alice} = join_room(socket_fixture(), room_id, "Alice")
    {:ok, _, _bob} = join_room(socket_fixture(), room_id, "Bob")

    push(alice, "new_msg", %{"body" => "ciphertext", "username" => "Alice", "iv" => "iv"})

    # Exactly one push should land in this process's mailbox - Bob's. If
    # broadcast! were used instead of broadcast_from!, Alice would get a
    # second copy of her own message here too.
    assert_push "new_msg", %{"body" => "ciphertext", "username" => "Alice"}, 500
    refute_push "new_msg", %{}, 100
  end

  test "typing is delivered to the other peer but not echoed back to the sender", %{
    room_id: room_id
  } do
    {:ok, _, alice} = join_room(socket_fixture(), room_id, "Alice")
    {:ok, _, _bob} = join_room(socket_fixture(), room_id, "Bob")

    push(alice, "typing", %{})

    assert_push "typing", %{}, 500
    refute_push "typing", %{}, 100
  end

  test "set_timer is broadcast to both peers, including the sender", %{room_id: room_id} do
    {:ok, _, alice} = join_room(socket_fixture(), room_id, "Alice")

    push(alice, "set_timer", %{"minutes" => 10})

    assert_broadcast "timer_set", %{"ms" => 600_000}
  end

  test "a joiner is told about a timer already set before they arrived", %{room_id: room_id} do
    {:ok, _, alice} = join_room(socket_fixture(), room_id, "Alice")
    push(alice, "set_timer", %{"minutes" => 10})
    assert_broadcast "timer_set", %{"ms" => 600_000}

    {:ok, _, _bob} = join_room(socket_fixture(), room_id, "Bob")

    assert_push "timer_set", %{"ms" => ms}, 500
    assert ms > 0 and ms <= 600_000
  end

  test "an invalid timer duration is ignored", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    push(socket, "set_timer", %{"minutes" => 5})

    refute_broadcast "timer_set", %{}
  end

  test "an oversized new_msg is dropped instead of broadcast", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    huge_body = String.duplicate("a", 8_001)
    push(socket, "new_msg", %{"body" => huge_body, "username" => "Alice", "iv" => "iv"})

    refute_broadcast "new_msg", %{}
  end

  test "an unknown event is ignored rather than crashing the channel", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    push(socket, "not_a_real_event", %{"whatever" => "you want"})

    # If the channel process had crashed, this call would fail/time out.
    assert ["Alice"] == ChannelState.list_users(room_id)
    assert Process.alive?(socket.channel_pid)
  end

  test "a flood of messages beyond the rate limit is dropped", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    # 20 events/5s is the limit (see @rate_limit_max_events); send one over.
    for i <- 1..20 do
      body = "msg#{i}"
      push(socket, "new_msg", %{"body" => body, "username" => "Alice", "iv" => "iv"})
      assert_broadcast "new_msg", %{"body" => ^body}
    end

    push(socket, "new_msg", %{"body" => "one_too_many", "username" => "Alice", "iv" => "iv"})
    refute_broadcast "new_msg", %{"body" => "one_too_many"}
  end

  test "adios deletes the room and broadcasts room_deleted", %{room_id: room_id} do
    {:ok, _, socket} = join_room(socket_fixture(), room_id, "Alice")

    push(socket, "adios", %{})

    assert_broadcast "room_deleted", %{}
    refute room_id in ChannelState.get_rooms()
  end

  defp socket_fixture do
    {:ok, socket} = connect(ChatsecWeb.UserSocket, %{})
    socket
  end
end
