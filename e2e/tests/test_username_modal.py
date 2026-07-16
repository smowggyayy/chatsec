from playwright.sync_api import expect

from conftest import ROOM_PATH_RE
import re


def _start_chat(page, base_url):
    page.goto(base_url)
    page.click("#start-chat-button")
    page.wait_for_url(re.compile(ROOM_PATH_RE.pattern))
    page.locator("#usernameModal").wait_for(state="visible")


def test_manual_username_is_accepted(page, base_url):
    _start_chat(page, base_url)
    page.get_by_placeholder("Username").fill("Playwright")
    page.click("#submitModalButton")

    expect(page.get_by_text("Username set.")).to_be_visible()
    expect(page.locator("#usernameModal")).to_be_hidden()
    expect(page.locator("#usernames")).to_contain_text("Playwright")


def test_random_username_button_fills_a_name(page, base_url):
    _start_chat(page, base_url)
    page.click("#randomModalButton")

    value = page.get_by_placeholder("Username").input_value()
    assert value, "Random button did not fill in a username"

    page.click("#submitModalButton")
    expect(page.get_by_text("Username set.")).to_be_visible()
    expect(page.locator("#usernames")).to_contain_text(value)


def test_empty_username_is_rejected(page, base_url):
    _start_chat(page, base_url)
    page.click("#submitModalButton")

    expect(page.get_by_text("Please enter a username.")).to_be_visible()
    expect(page.locator("#usernameModal")).to_be_visible()


def test_cancel_leaves_username_unset(page, base_url):
    _start_chat(page, base_url)
    page.click("#closeModalButton")

    expect(page.get_by_text("Username not set.")).to_be_visible()
    expect(page.locator("#usernameModal")).to_be_hidden()


def test_username_is_sanitized(page, base_url):
    _start_chat(page, base_url)
    page.get_by_placeholder("Username").fill("<b>Mal'ory</b>!!")
    page.click("#submitModalButton")

    expect(page.locator("#usernames")).to_contain_text("Malory")
    expect(page.locator("#usernames")).not_to_contain_text("<b>")


def test_username_input_is_capped_at_32_characters(page, base_url):
    _start_chat(page, base_url)
    username_input = page.get_by_placeholder("Username")
    username_input.press_sequentially("a" * 40)

    assert len(username_input.input_value()) == 32
