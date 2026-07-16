defmodule ChatsecWeb.ChannelStateTest do
  use ExUnit.Case
  import ExUnit.CaptureLog
  alias ChatsecWeb.ChannelState

  setup do
    pid = start_supervised!({ChannelState, name: :test})
    {:ok, pid: pid}
  end

  test "Create & delete a chatroom", %{pid: pid} do
    room_id = UUID.uuid4()
    assert :ok == ChannelState.create_room(pid, room_id)
    assert [room_id] == ChannelState.get_rooms(pid)
    assert :ok == ChannelState.delete_room(pid, room_id)
    assert [] == ChannelState.get_rooms(pid)
  end

  test "User joins a chatroom, then leaves", %{pid: pid} do
    room_id = UUID.uuid4()
    user = "Slayer"

    assert :ok == ChannelState.create_room(pid, room_id)
    assert [room_id] == ChannelState.get_rooms(pid)
    assert :ok == ChannelState.join(pid, room_id, user)
    assert [user] == ChannelState.list_users(pid, room_id)

    assert :ok == ChannelState.leave(pid, room_id, user)
    assert [] == ChannelState.list_users(pid, room_id)
  end

  test "A third user is rejected once a room has two", %{pid: pid} do
    room_id = UUID.uuid4()
    assert :ok == ChannelState.create_room(pid, room_id)
    assert :ok == ChannelState.try_join(pid, room_id, "Alice")
    assert :ok == ChannelState.try_join(pid, room_id, "Bob")
    assert {:error, :room_full} == ChannelState.try_join(pid, room_id, "Charlie")
  end

  test "delete_all_empty_rooms only removes rooms with nobody in them", %{pid: pid} do
    empty_room = UUID.uuid4()
    occupied_room = UUID.uuid4()

    assert :ok == ChannelState.create_room(pid, empty_room)
    assert :ok == ChannelState.create_room(pid, occupied_room)
    assert :ok == ChannelState.join(pid, occupied_room, "Alice")

    assert :ok == ChannelState.delete_all_empty_rooms(pid)

    assert [occupied_room] == ChannelState.get_rooms(pid)
  end

  test "room data survives an abnormal crash-and-restart, but not a normal stop" do
    {:ok, pid} = ChannelState.start_link(name: :crash_test)
    room_id = UUID.uuid4()
    assert :ok == ChannelState.create_room(pid, room_id)
    assert :ok == ChannelState.join(pid, room_id, "Alice")

    # Unlink first - start_link links to us, and :kill propagates through
    # links unconditionally, which would take the test process down too.
    Process.unlink(pid)
    ref = Process.monitor(pid)

    # The app supervisor (this table's heir) logs an "unexpected message"
    # error when it receives the ETS-TRANSFER notification, since it isn't
    # written to expect one - that's expected noise from this specific
    # simulated crash, not a real problem, so keep it out of test output.
    capture_log(fn ->
      Process.exit(pid, :kill)
      assert_receive {:DOWN, ^ref, :process, ^pid, :killed}
      # give the ETS-TRANSFER message a moment to reach the supervisor
      Process.sleep(50)
    end)

    {:ok, restarted_pid} = ChannelState.start_link(name: :crash_test)

    assert [room_id] == ChannelState.get_rooms(restarted_pid)
    assert ["Alice"] == ChannelState.list_users(restarted_pid, room_id)

    # A deliberate stop (not a crash) is expected to clean the table up.
    GenServer.stop(restarted_pid)
    {:ok, fresh_pid} = ChannelState.start_link(name: :crash_test)
    assert [] == ChannelState.get_rooms(fresh_pid)
    GenServer.stop(fresh_pid)
  end
end
