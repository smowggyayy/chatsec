defmodule ChatsecWeb.ChannelState do
  use GenServer

  def start_link(option) do
    name = Keyword.get(option, :name, __MODULE__)
    GenServer.start_link(__MODULE__, [], name: name)
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
  def init(_) do
    {:ok, %{}}
  end

  @impl true
  def handle_call({:list_users, room_id}, _from, state) do
    {:reply, Map.get(state, room_id, []), state}
  end

  @impl true
  def handle_call({:create, room_id}, _from, state) do
    {:reply, :ok, Map.put(state, room_id, [])}
  end

  @impl true
  def handle_call({:delete, room_id}, _from, state) do
    {:reply, :ok, Map.delete(state, room_id)}
  end

  @impl true
  def handle_call(:delete_empty, _from, state) do
    {:reply, :ok, Map.reject(state, fn {_room_id, users} -> users == [] end)}
  end

  @impl true
  def handle_call(:list_rooms, _from, state) do
    {:reply, Map.keys(state), state}
  end

  @impl true
  def handle_call({:join, room_id, identifier}, _from, state) do
    {:reply, :ok,
     Map.update(state, room_id, [identifier], fn identifiers ->
       [identifier | Enum.reject(identifiers, &(&1 == identifier))]
     end)}
  end

  @impl true
  def handle_call({:try_join, room_id, identifier}, _from, state) do
    users = Map.get(state, room_id, [])

    if length(users) < 2 do
      new_state =
        Map.update(state, room_id, [identifier], fn ids ->
          [identifier | Enum.reject(ids, &(&1 == identifier))]
        end)

      {:reply, :ok, new_state}
    else
      {:reply, {:error, :room_full}, state}
    end
  end

  @impl true
  def handle_call({:leave, room_id, identifier}, _from, state) do
    updated_state =
      if Map.has_key?(state, room_id) do
        Map.update!(state, room_id, fn identifiers ->
          Enum.reject(identifiers, &(&1 == identifier))
        end)
      else
        state
      end

    {:reply, :ok, updated_state}
  end
end
