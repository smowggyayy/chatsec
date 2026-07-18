defmodule ChatsecWeb.ChannelState do
  @moduledoc """
  Tracks which chat rooms currently exist and who is in them.

  Backed by a public, named ETS table rather than plain GenServer state.
  If this process crashes, its supervisor restarts it (`:one_for_one`) -
  with ordinary GenServer state that would silently wipe every active room,
  so anyone who refreshed a tab mid-conversation would hit "room not found"
  even though their chat is still live. Setting the app's top supervisor as
  the table's heir keeps the table (and the room data in it) alive across
  such a crash-and-restart; a deliberate, normal stop (e.g. in tests) still
  tears the table down in `terminate/2`, so repeated test runs stay isolated.

  Self-destruct timers (see set_expiry/3) live only in this process's own
  GenServer state, not the ETS table - losing a scheduled timer on a crash
  is a low-stakes edge case (the room just outlives its timer instead of
  disappearing on schedule), unlike losing the room list itself.
  """
  use GenServer

  def start_link(option) do
    name = Keyword.get(option, :name, __MODULE__)
    GenServer.start_link(__MODULE__, name, name: name)
  end

  def get_rooms(pid \\ __MODULE__) do
    GenServer.call(pid, :list_rooms)
  end

  def create_room(pid \\ __MODULE__, room_id) do
    GenServer.call(pid, {:create, room_id})
  end

  def delete_room(pid \\ __MODULE__, room_id) do
    GenServer.call(pid, {:delete, room_id})
  end

  def delete_all_empty_rooms(pid \\ __MODULE__) do
    GenServer.call(pid, :delete_empty)
  end

  def list_users(pid \\ __MODULE__, room_id) do
    GenServer.call(pid, {:list_users, room_id})
  end

  def join(pid \\ __MODULE__, room_id, identifier) do
    GenServer.call(pid, {:join, room_id, identifier})
  end

  # Atomically checks room capacity and joins. Returns :ok or {:error, :room_full}.
  def try_join(pid \\ __MODULE__, room_id, identifier) do
    GenServer.call(pid, {:try_join, room_id, identifier})
  end

  def leave(pid \\ __MODULE__, room_id, identifier) do
    GenServer.call(pid, {:leave, room_id, identifier})
  end

  # Schedules the room for deletion in `ms` milliseconds, replacing any
  # timer already pending for it. Fires even if the room is empty/full/idle -
  # this is a hard lifetime cap, not another empty-room sweep.
  def set_expiry(pid \\ __MODULE__, room_id, ms) do
    GenServer.call(pid, {:set_expiry, room_id, ms})
  end

  def clear_expiry(pid \\ __MODULE__, room_id) do
    GenServer.call(pid, {:clear_expiry, room_id})
  end

  # Milliseconds remaining until the room's timer fires, or nil if none is set.
  def get_expiry(pid \\ __MODULE__, room_id) do
    GenServer.call(pid, {:get_expiry, room_id})
  end

  @impl true
  def init(name) do
    # terminate/2 is only guaranteed to run on a supervisor-initiated
    # shutdown if we're trapping exits - without this, a normal stop (e.g.
    # test teardown) would skip our cleanup and leak the ETS table.
    Process.flag(:trap_exit, true)
    table_name = :"#{name}_rooms"

    table =
      case :ets.whereis(table_name) do
        :undefined -> :ets.new(table_name, [:set, :public, :named_table] ++ heir_opts())
        tid -> tid
      end

    {:ok, %{table: table, timers: %{}}}
  end

  defp heir_opts do
    case Process.whereis(Chatsec.Supervisor) do
      nil -> []
      pid -> [{:heir, pid, []}]
    end
  end

  @impl true
  def terminate(reason, %{table: table}) when reason in [:normal, :shutdown] do
    :ets.delete(table)
    :ok
  end

  def terminate({:shutdown, _}, %{table: table}) do
    :ets.delete(table)
    :ok
  end

  def terminate(_reason, _state), do: :ok

  @impl true
  def handle_call({:list_users, room_id}, _from, %{table: table} = state) do
    {:reply, lookup(table, room_id), state}
  end

  @impl true
  def handle_call({:create, room_id}, _from, %{table: table} = state) do
    :ets.insert(table, {room_id, []})
    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:delete, room_id}, _from, %{table: table} = state) do
    :ets.delete(table, room_id)
    {:reply, :ok, cancel_timer(state, room_id)}
  end

  @impl true
  def handle_call(:delete_empty, _from, %{table: table} = state) do
    :ets.match_delete(table, {:_, []})
    {:reply, :ok, state}
  end

  @impl true
  def handle_call(:list_rooms, _from, %{table: table} = state) do
    rooms = :ets.select(table, [{{:"$1", :_}, [], [:"$1"]}])
    {:reply, rooms, state}
  end

  @impl true
  def handle_call({:join, room_id, identifier}, _from, %{table: table} = state) do
    :ets.insert(table, {room_id, add_identifier(lookup(table, room_id), identifier)})
    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:try_join, room_id, identifier}, _from, %{table: table} = state) do
    users = lookup(table, room_id)

    if length(users) < 2 do
      :ets.insert(table, {room_id, add_identifier(users, identifier)})
      {:reply, :ok, state}
    else
      {:reply, {:error, :room_full}, state}
    end
  end

  @impl true
  def handle_call({:leave, room_id, identifier}, _from, %{table: table} = state) do
    case :ets.lookup(table, room_id) do
      [{^room_id, users}] ->
        :ets.insert(table, {room_id, Enum.reject(users, &(&1 == identifier))})

      [] ->
        :ok
    end

    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:set_expiry, room_id, ms}, _from, state) do
    state = cancel_timer(state, room_id)
    ref = Process.send_after(self(), {:expire, room_id}, ms)
    {:reply, :ok, put_in(state.timers[room_id], ref)}
  end

  @impl true
  def handle_call({:clear_expiry, room_id}, _from, state) do
    {:reply, :ok, cancel_timer(state, room_id)}
  end

  @impl true
  def handle_call({:get_expiry, room_id}, _from, %{timers: timers} = state) do
    remaining =
      with ref when ref != nil <- timers[room_id],
           ms when is_integer(ms) <- Process.read_timer(ref) do
        ms
      else
        _ -> nil
      end

    {:reply, remaining, state}
  end

  @impl true
  def handle_info({:expire, room_id}, %{table: table} = state) do
    :ets.delete(table, room_id)
    ChatsecWeb.Endpoint.broadcast!("room:" <> room_id, "room_deleted", %{})
    {:noreply, %{state | timers: Map.delete(state.timers, room_id)}}
  end

  defp cancel_timer(state, room_id) do
    case state.timers[room_id] do
      nil -> state
      ref -> Process.cancel_timer(ref)
    end

    %{state | timers: Map.delete(state.timers, room_id)}
  end

  defp lookup(table, room_id) do
    case :ets.lookup(table, room_id) do
      [{^room_id, users}] -> users
      [] -> []
    end
  end

  defp add_identifier(users, identifier) do
    [identifier | Enum.reject(users, &(&1 == identifier))]
  end
end
