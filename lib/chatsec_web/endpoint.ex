defmodule ChatsecWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :chatsec
  import Phoenix.Controller, only: [put_secure_browser_headers: 2]

  @content_security_policy [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ]
  |> Enum.join("; ")

  @permissions_policy [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "clipboard-write=(self)",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
    "sync-xhr=()",
    "usb=()",
    "web-share=()",
    "xr-spatial-tracking=()"
  ]
  |> Enum.join(", ")

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_chatsec_key",
    signing_salt: "7V1VpVRK",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket,
    websocket: [connect_info: [session: @session_options]],
    longpoll: [connect_info: [session: @session_options]]

  # The default idle timeout (60s) means an uncleanly-disconnected peer (lid
  # closed, wifi dropped) can keep occupying their room's second slot for up
  # to a minute before the server notices and frees it. Shortened to 40s,
  # paired with the client's 15s heartbeat interval (chat.js) so there's
  # still comfortable margin against normal network jitter.
  socket "/socket", ChatsecWeb.UserSocket,
    websocket: [timeout: 40_000],
    longpoll: false

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug Plug.Static,
    at: "/",
    from: :chatsec,
    gzip: false,
    only: ChatsecWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  # Applied here (rather than in the router's :browser pipeline) so that
  # every response carries these headers, including error pages rendered
  # for requests that never matched a route (e.g. a plain 404).
  plug :put_security_headers

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug ChatsecWeb.Router

  defp put_security_headers(conn, _opts) do
    put_secure_browser_headers(conn, %{
      "content-security-policy" => @content_security_policy,
      "permissions-policy" => @permissions_policy
    })
  end
end
