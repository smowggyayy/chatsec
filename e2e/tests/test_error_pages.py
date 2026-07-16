import re

from playwright.sync_api import expect

from conftest import ROOM_PATH_RE


def test_unknown_room_shows_room_not_found(page, base_url):
    page.goto(f"{base_url}/chat/does-not-exist")

    expect(page.get_by_text("Room not found")).to_be_visible()
    expect(page.get_by_role("link", name="Go home")).to_be_visible()
    expect(page.locator("#create-room-button")).to_be_visible()


def test_room_not_found_create_room_button_starts_a_new_chat(page, base_url):
    page.goto(f"{base_url}/chat/does-not-exist")
    page.click("#create-room-button")

    page.wait_for_url(re.compile(ROOM_PATH_RE.pattern))
    expect(page.locator("#usernameModal")).to_be_visible()


def test_unknown_path_shows_404(page, base_url):
    page.goto(f"{base_url}/not-a-real-path")

    expect(page.get_by_text("404")).to_be_visible()
    expect(page.get_by_text("Page not found")).to_be_visible()
    expect(page.get_by_role("link", name="Go home")).to_be_visible()
