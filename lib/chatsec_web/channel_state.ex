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

    {:ok, table}
  end

  defp heir_opts do
    case Process.whereis(Chatsec.Supervisor) do
      nil -> []
      pid -> [{:heir, pid, []}]
    end
  end

  @impl true
  def terminate(reason, table) when reason in [:normal, :shutdown] do
    :ets.delete(table)
    :ok
  end

  def terminate({:shutdown, _}, table) do
    :ets.delete(table)
    :ok
  end

  def terminate(_reason, _table), do: :ok

  @impl true
  def handle_call({:list_users, room_id}, _from, table) do
    {:reply, lookup(table, room_id), table}
  end

  @impl true
  def handle_call({:create, room_id}, _from, table) do
    :ets.insert(table, {room_id, []})
    {:reply, :ok, table}
  end

  @impl true
  def handle_call({:delete, room_id}, _from, table) do
    :ets.delete(table, room_id)
    {:reply, :ok, table}
  end

  @impl true
  def handle_call(:delete_empty, _from, table) do
    :ets.match_delete(table, {:_, []})
    {:reply, :ok, table}
  end

  @impl true
  def handle_call(:list_rooms, _from, table) do
    rooms = :ets.select(table, [{{:"$1", :_}, [], [:"$1"]}])
    {:reply, rooms, table}
  end

  @impl true
  def handle_call({:join, room_id, identifier}, _from, table) do
    :ets.insert(table, {room_id, add_identifier(lookup(table, room_id), identifier)})
    {:reply, :ok, table}
  end

  @impl true
  def handle_call({:try_join, room_id, identifier}, _from, table) do
    users = lookup(table, room_id)

    if length(users) < 2 do
      :ets.insert(table, {room_id, add_identifier(users, identifier)})
      {:reply, :ok, table}
    else
      {:reply, {:error, :room_full}, table}
    end
  end

  @impl true
  def handle_call({:leave, room_id, identifier}, _from, table) do
    case :ets.lookup(table, room_id) do
      [{^room_id, users}] ->
        :ets.insert(table, {room_id, Enum.reject(users, &(&1 == identifier))})

      [] ->
        :ok
    end

    {:reply, :ok, table}
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
