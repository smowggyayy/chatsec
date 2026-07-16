defmodule ChatsecWeb.ChannelCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ChannelTest` and also
  import other functionality to make it easier
  to build common data structures.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # The default endpoint for testing
      @endpoint ChatsecWeb.Endpoint

      use ChatsecWeb, :verified_routes

      # Import conveniences for testing with channels
      import Phoenix.ChannelTest
      import ChatsecWeb.ChannelCase
    end
  end

  setup _tags do
    :ok
  end
end
