import re
from playwright.sync_api import expect, sync_playwright
import pytest
import time
from dotenv import load_dotenv
import os

load_dotenv()
IP = os.getenv("IP")
PORT = os.getenv("PORT")

@pytest.fixture(scope="function")
def setup():
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)

        context_alice = browser.new_context(ignore_https_errors=True)
        page_alice = context_alice.new_page()
        page_alice.goto(f"https://{IP}:{PORT}/")

        context_bob = browser.new_context(ignore_https_errors=True)
        page_bob = context_bob.new_page()

        yield {'page_alice': page_alice, 'page_bob': page_bob}
        context_alice.close()
        context_bob.close()

def test_e2ee_conversation(setup):
    alice = setup['page_alice']
    alice.click("text='Start a chat'")
    alice.wait_for_url(re.compile(r"/chat/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"))
    alice.get_by_placeholder("Username").fill("Alice")
    alice.click("text='Submit'")
    chatroom = alice.url
    time.sleep(1)

    bob = setup['page_bob']
    bob.goto(chatroom)
    bob.get_by_placeholder("Username").fill("Bob")
    bob.click("text='Submit'")

    bob.locator("text='Handshake completed!'").wait_for(state="visible") # Wait for the handshake to succeed
    message = "Hey Alice!"
    bob.get_by_placeholder("Write a message..").fill(message)
    bob.keyboard.press('Enter')
    messages = alice.locator("div:has-text('Messages.')")
    assert messages.locator(f"text={message}").is_visible(), "The message was not sent."

    # Delete the room
    bob.click("text='Delete room'")
    bob.locator("text='Confirm deletion?'").wait_for(state="visible") # Wait for the delete modal to show up
    bob.click("text='Delete chat'")

    # Wait for Alice to be redirected to the home page
    alice.wait_for_url(f"https://{IP}:{PORT}/")

    assert alice.url == f"https://{IP}:{PORT}/", "The room was not deleted properly."
