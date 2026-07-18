defmodule ChatsecWeb.RoomChannel do
  use Phoenix.Channel
  alias ChatsecWeb.Presence
  alias ChatsecWeb.ChannelState

  # Client-side sanitization (username.js) already restricts to this shape,
  # but the channel is reachable by any WebSocket client, not just ours -
  # never trust the client for the actual guarantee.
  @username_regex ~r/^[a-zA-Z0-9 ]{1,32}$/
  @max_message_bytes 8_000
  # Bounds how fast a single connection can push publickey/new_msg/typing
  # events - generous for real typing, but stops one peer from flooding the
  # other's browser or forcing repeated expensive ECDH derivations.
  @rate_limit_window_ms 5_000
  @rate_limit_max_events 20
  # 0 means "off". Fixed options rather than an arbitrary client-supplied
  # duration - never trust the client for a value that schedules server work.
  @allowed_timer_minutes [0, 10, 30, 60]

  def join("room:" <> room_id, %{"username" => username}, socket)
      when is_binary(username) do
    if valid_username?(username) do
      case ChannelState.try_join(room_id, username) do
        :ok ->
          send(self(), {:after_join, username})
          {:ok, assign(socket, user_id: username, room_id: room_id)}

        {:error, :room_full} ->
          {:error, %{reason: "room_full"}}
      end
    else
      {:error, %{reason: "invalid_username"}}
    end
  end

  def join("room:" <> _room_id, _params, _socket) do
    {:error, %{reason: "invalid_username"}}
  end

  def handle_in("publickey", %{"publickey" => publickey, "username" => username}, socket) do
    case check_rate_limit(socket) do
      {:ok, socket} ->
        broadcast!(socket, "publickey", %{"publickey" => publickey, "username" => username})
        {:noreply, socket}

      {:error, socket} ->
        {:noreply, socket}
    end
  end

  def handle_in("new_msg", %{"body" => body, "username" => username, "iv" => iv}, socket)
      when byte_size(body) <= @max_message_bytes do
    case check_rate_limit(socket) do
      {:ok, socket} ->
        # broadcast_from! (not broadcast!) - the sender renders their own
        # message locally as soon as the push succeeds, rather than waiting
        # on it to echo back over the wire.
        broadcast_from!(socket, "new_msg", %{
          "body" => body,
          "username" => username,
          "iv" => iv
        })

        {:noreply, socket}

      {:error, socket} ->
        {:noreply, socket}
    end
  end

  # No payload needed - a room only ever has the two peers, so "typing" is
  # unambiguous about who. Client-side throttles how often this is sent;
  # this shares the same rate limit as everything else as a backstop.
  def handle_in("typing", _params, socket) do
    case check_rate_limit(socket) do
      {:ok, socket} ->
        broadcast_from!(socket, "typing", %{})
        {:noreply, socket}

      {:error, socket} ->
        {:noreply, socket}
    end
  end

  # Either peer can set/change/clear this - a 2-person room doesn't have a
  # meaningful "owner" once both are in it. Broadcasts (not broadcast_from!)
  # since this is UI state both sides should stay in sync on, not something
  # the sender already renders locally like new_msg does.
  def handle_in("set_timer", %{"minutes" => minutes}, socket)
      when minutes in @allowed_timer_minutes do
    case check_rate_limit(socket) do
      {:ok, socket} ->
        ms = minutes * 60_000

        if minutes == 0 do
          ChannelState.clear_expiry(socket.assigns.room_id)
        else
          ChannelState.set_expiry(socket.assigns.room_id, ms)
        end

        broadcast!(socket, "timer_set", %{"ms" => ms})
        {:noreply, socket}

      {:error, socket} ->
        {:noreply, socket}
    end
  end

  def handle_in("adios", _, socket) do
    ChannelState.delete_room(socket.assigns.room_id)
    broadcast!(socket, "room_deleted", %{})
    {:noreply, socket}
  end

  # Catches unknown events and malformed/oversized payloads for known ones
  # (e.g. a "new_msg" that fails the size guard above falls through to here)
  # so a hostile or buggy client can't crash the channel process.
  def handle_in(_event, _params, socket), do: {:noreply, socket}

  defp valid_username?(username) do
    String.trim(username) != "" and username =~ @username_regex
  end

  defp check_rate_limit(socket) do
    now = System.monotonic_time(:millisecond)

    recent =
      socket.assigns
      |> Map.get(:event_timestamps, [])
      |> Enum.filter(&(now - &1 < @rate_limit_window_ms))

    if length(recent) >= @rate_limit_max_events do
      {:error, socket}
    else
      {:ok, assign(socket, :event_timestamps, [now | recent])}
    end
  end

  def handle_info({:after_join, username}, socket) do
    track_user_presence(socket, username)
    broadcast!(socket, "after_join", %{"username" => username})
    push_current_timer(socket)
    {:noreply, socket}
  end

  # If a timer was already set before this peer joined (or they're
  # rejoining after a refresh), tell them where the countdown currently
  # stands rather than leaving their UI with no indication it's running.
  defp push_current_timer(socket) do
    case ChannelState.get_expiry(socket.assigns.room_id) do
      nil -> :ok
      remaining_ms -> push(socket, "timer_set", %{"ms" => remaining_ms})
    end
  end

  def terminate(_, socket) do
    case socket.assigns do
      %{user_id: username, room_id: room_id} ->
        Presence.untrack(socket, username)
        ChannelState.leave(room_id, username)

      _ ->
        :ok
    end

    :ok
  end

  defp track_user_presence(socket, username) do
    Presence.track(socket, username, %{online_at: to_string(System.system_time(:second))})
    push(socket, "presence_state", Presence.list(socket))
  end
end
