import os
import re
import socket
from pathlib import Path
from urllib.parse import urlparse

import pytest
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv(Path(__file__).parent / ".env")

IP = os.getenv("IP", "127.0.0.1")
PORT = os.getenv("PORT", "4001")
BASE_URL = f"https://{IP}:{PORT}"

ROOM_PATH_RE = re.compile(
    r"/chat/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


@pytest.fixture(scope="session")
def base_url():
    parsed = urlparse(BASE_URL)
    try:
        with socket.create_connection((parsed.hostname, parsed.port), timeout=2):
            pass
    except OSError as exc:
        pytest.exit(
            f"Could not reach {BASE_URL} ({exc}). Start the dev server first: "
            "`mix phx.server` (see e2e/README.md).",
            returncode=1,
        )
    return BASE_URL


@pytest.fixture(scope="session")
def browser_instance():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        yield browser
        browser.close()


def _new_page(browser_instance):
    context = browser_instance.new_context(ignore_https_errors=True)
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    return context, context.new_page()


@pytest.fixture
def page(browser_instance):
    """A single ready-to-use page/context, closed automatically after the test."""
    context, page = _new_page(browser_instance)
    yield page
    context.close()


@pytest.fixture
def make_page(browser_instance):
    """Factory for extra independent browser contexts (separate users/peers).

    Each call returns a brand new page with its own cookies/sessionStorage,
    so it behaves like a different person joining from a different browser.
    """
    contexts = []

    def _make():
        context, page = _new_page(browser_instance)
        contexts.append(context)
        return page

    yield _make
    for context in contexts:
        context.close()


# --- shared flows -----------------------------------------------------------


def set_username(page, username=None):
    """Fill in (or randomize) and submit the username modal."""
    modal = page.locator("#usernameModal")
    modal.wait_for(state="visible")
    if username is None:
        page.click("#randomModalButton")
    else:
        page.get_by_placeholder("Username").fill(username)
    page.click("#submitModalButton")
    modal.wait_for(state="detached")


def create_room(page, base_url, username="Alice"):
    """Start a brand new chat room from the home page and join it. Returns the room URL."""
    page.goto(base_url)
    page.click("#start-chat-button")
    page.wait_for_url(re.compile(ROOM_PATH_RE.pattern))
    set_username(page, username)
    return page.url


def join_room(page, room_url, username="Bob"):
    """Navigate an existing page to an existing room and join it."""
    page.goto(room_url)
    set_username(page, username)


def wait_for_send_ready(page, timeout=15000):
    """Wait until the E2EE handshake has completed and Send is enabled."""
    page.locator("#sendButton:not([disabled])").wait_for(state="visible", timeout=timeout)


def send_message(page, text):
    wait_for_send_ready(page)
    page.fill("#chat-input", text)
    page.click("#sendButton")
