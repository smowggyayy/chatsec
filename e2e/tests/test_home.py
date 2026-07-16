import re

from playwright.sync_api import expect

from conftest import ROOM_PATH_RE


def test_home_page_loads(page, base_url):
    page.goto(base_url)
    expect(page).to_have_title(re.compile("ChatSec"))
    expect(page.locator("h1", has_text="CHATSEC")).to_be_visible()


def test_tell_me_more_expands_and_hides_short_text(page, base_url):
    page.goto(base_url)
    expect(page.locator("#full-text-container")).to_be_hidden()
    expect(page.locator("#short-text")).to_be_visible()

    page.click("#tell-me-more")

    expect(page.locator("#full-text-container")).to_be_visible()
    expect(page.locator("#short-text")).to_be_hidden()
    expect(page.locator("#full-text-container")).to_contain_text("Chatsec is a open-source")


def test_donate_modal_opens_and_closes(page, base_url):
    page.goto(base_url)
    page.click("#donate-button")

    expect(page.get_by_text("Donate?")).to_be_visible()
    expect(page.locator("#chatUrl")).to_have_value(re.compile(r"^4"))  # monero address

    page.click("#closeModalButton")
    expect(page.get_by_text("Donate?")).to_be_hidden()


def test_donate_copy_address_shows_toast(page, base_url):
    page.goto(base_url)
    page.click("#donate-button")
    page.click("#submitModalButton")  # "Copy address"
    expect(page.get_by_text("Copied to clipboard.")).to_be_visible()


def test_start_chat_creates_room_and_prompts_for_username(page, base_url):
    page.goto(base_url)
    page.click("#start-chat-button")

    page.wait_for_url(re.compile(ROOM_PATH_RE.pattern))
    expect(page.locator("#usernameModal")).to_be_visible()
