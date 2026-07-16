defmodule ChatsecWeb.EndpointTest do
  use ChatsecWeb.ConnCase

  test "security headers are present on a normal page", %{conn: conn} do
    conn = get(conn, ~p"/")

    csp = get_resp_header(conn, "content-security-policy") |> List.first()
    assert csp =~ "default-src 'self'"
    assert csp =~ "script-src 'self'"
    assert csp =~ "object-src 'none'"
    refute csp =~ "unsafe-inline"

    permissions_policy = get_resp_header(conn, "permissions-policy") |> List.first()
    assert permissions_policy =~ "camera=()"
    assert permissions_policy =~ "clipboard-write=(self)"

    assert get_resp_header(conn, "x-frame-options") == ["SAMEORIGIN"]
    assert get_resp_header(conn, "x-content-type-options") == ["nosniff"]
  end

  test "security headers are present even on a route that never matched (plain 404)", %{conn: conn} do
    conn = get(conn, "/this-route-does-not-exist")

    assert conn.status == 404
    assert get_resp_header(conn, "content-security-policy") != []
    assert get_resp_header(conn, "permissions-policy") != []
  end
end
