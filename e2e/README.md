# ChatSec end-to-end tests

Browser-driven tests (Playwright + pytest) covering the full app: home page,
username flow, chat room messaging/presence/invite/delete, room capacity,
error pages, and the security response headers.

## Setup

```sh
cd e2e
poetry install
poetry run playwright install chromium
```

## Running

The suite drives a real browser against a running dev server — it does not
start one for you. In one terminal:

```sh
mix phx.server
```

Then, in another terminal:

```sh
cd e2e
poetry run pytest
```

`tests/.env` points the suite at `https://127.0.0.1:4001` (the default dev
server, self-signed cert). Override `IP`/`PORT` there to point at a different
environment, e.g. a staging deploy.

Useful flags:

```sh
poetry run pytest -v                     # verbose
poetry run pytest tests/test_chat_room.py  # one file
poetry run pytest -k presence            # by name
poetry run pytest --headed --slowmo 250  # watch it run
```

## Notes

- Every chat room requires two peers to complete an ECDH handshake before
  messages can be encrypted, so most chat-room tests open two independent
  browser contexts (`make_page` fixture) to act as both parties.
- `strict-transport-security` (HSTS) is only emitted when `force_ssl` is
  configured (see `config/prod.exs`), which is intentionally off in dev to
  avoid forcing HTTPS redirects during local development. It is not exercised
  by this suite; see the root `CLAUDE.md` for how it's verified instead.
