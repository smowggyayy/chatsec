import re
from playwright.sync_api import expect, sync_playwright
import pytest
import time
from dotenv import load_dotenv
import os

load_dotenv()
IP = os.getenv("IP")
PORT = os.getenv("PORT")

# Setup function always starts a new chat
@pytest.fixture(scope="function")
def setup():
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        page.goto(f"https://{IP}:{PORT}/")
        page.click("text='Start a chat'")
        page.wait_for_url(re.compile(r"/chat/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))
        page.get_by_placeholder("Username").fill("Playwright")
        page.click("text='Submit'")
        yield page
        context.close()
        browser.close()

def test_copy_link_button(setup):
    page = setup
    page.click("text='Invite user'")
    page.click("text='Copy URL'")
    # Check for the "Copied to clipboard" message
    assert page.is_visible("text='Copied to clipboard.'"), "The 'Copied to clipboard' message did not appear."

def test_username_shows_as_online(setup):
    page = setup
    time.sleep(1)
    # Find the parent element containing the "Online" text
    parent = page.locator("div:has-text('Online')")
    # Check if the username appears as online
    assert parent.locator("text='Playwright'").is_visible(), "The Username did not appear as online."
