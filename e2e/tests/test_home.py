import re
from playwright.sync_api import expect, sync_playwright
import pytest
from dotenv import load_dotenv
import os

load_dotenv()
IP = os.getenv("IP")
PORT = os.getenv("PORT")


@pytest.fixture(scope="function")
def setup():
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        page.goto(f"https://{IP}:{PORT}/")
        yield page
        context.close()
        browser.close()

def test_opening_page(setup):
    page = setup
    expect(page).to_have_title(re.compile("ChatSec"))

def test_set_username_manual(setup):
    page = setup
    page.click("text='Start a chat'")
    page.wait_for_url(re.compile(r"/chat/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))
    page.locator("text='Enter Username'").wait_for(state="visible")
    page.get_by_placeholder("Username").fill("Playwright")
    page.click("text='Submit'")
    assert page.locator("text='Username set.'").is_visible(), "Failed to enter username manually!"

def test_set_username_random(setup):
    page = setup
    page.click("text='Start a chat'")
    page.wait_for_url(re.compile(r"/chat/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))
    page.locator("text='Enter Username'").wait_for(state="visible")
    page.click("text='Random'")
    page.click("text='Submit'")
    assert page.locator("text='Username set.'").is_visible(), "Failed to use random username!"
