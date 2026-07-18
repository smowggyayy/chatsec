import re

from playwright.sync_api import expect

from conftest import create_room, join_room, send_message, wait_for_send_ready


def test_send_button_disabled_until_handshake_completes(make_page, base_url):
    """Regression test: Send used to be clickable before the E2EE handshake
    finished, silently dropping the message. It must now stay disabled until
    a peer has joined and the shared key has been derived."""
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    expect(alice.locator("#sendButton")).to_be_disabled()

    bob = make_page()
    join_room(bob, room_url, "Bob")

    expect(alice.locator("#sendButton")).to_be_enabled(timeout=15000)
    expect(bob.locator("#sendButton")).to_be_enabled(timeout=15000)


def test_peer_shows_as_online_in_presence_list(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")

    expect(alice.locator("#usernames")).to_contain_text("Alice")
    expect(alice.locator("#usernames")).to_contain_text("Bob")
    expect(bob.locator("#usernames")).to_contain_text("Alice")
    expect(bob.locator("#usernames")).to_contain_text("Bob")


def test_peer_disconnecting_goes_offline_in_presence_list(make_page, base_url, browser_instance):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")

    bob_context = browser_instance.new_context(ignore_https_errors=True)
    bob = bob_context.new_page()
    join_room(bob, room_url, "Bob")
    expect(alice.locator("#usernames")).to_contain_text("Bob")

    bob_context.close()  # Bob disconnects (closes tab / goes offline)

    expect(alice.locator("#usernames")).not_to_contain_text("Bob", timeout=10000)
    expect(alice.locator("#usernames")).to_contain_text("Alice")


def test_encrypted_message_round_trip_both_directions(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")

    send_message(alice, "Hey Bob, this is Alice")
    expect(bob.locator("#messages")).to_contain_text("Hey Bob, this is Alice")
    # Alice renders her own message locally rather than waiting on it to
    # echo back from the server - confirm it actually shows up for her too.
    expect(alice.locator("#messages")).to_contain_text("Hey Bob, this is Alice")

    send_message(bob, "Loud and clear, Alice")
    expect(alice.locator("#messages")).to_contain_text("Loud and clear, Alice")
    expect(bob.locator("#messages")).to_contain_text("Loud and clear, Alice")


def test_chat_message_is_capped_at_2000_characters(make_page, base_url):
    # maxlength is a static DOM constraint independent of the E2EE handshake,
    # so there's no need for a second peer to join here.
    alice = make_page()
    create_room(alice, base_url, "Alice")

    # press_sequentially simulates real keystrokes (unlike setting .value
    # directly), which is what the maxlength attribute actually constrains.
    chat_input = alice.locator("#chat-input")
    chat_input.press_sequentially("a" * 2010)

    assert len(chat_input.input_value()) == 2000


def test_enter_sends_shift_enter_inserts_newline(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    chat_input = alice.locator("#chat-input")
    chat_input.fill("line one")
    chat_input.press("Shift+Enter")
    chat_input.press_sequentially("line two")
    assert "\n" in chat_input.input_value(), "Shift+Enter should insert a newline, not send"

    chat_input.press("Enter")
    expect(chat_input).to_have_value("")
    expect(bob.locator("#messages")).to_contain_text("line one")
    expect(bob.locator("#messages")).to_contain_text("line two")


def test_typing_indicator_shows_then_clears_after_inactivity(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    expect(bob.locator("#typing-indicator")).to_be_hidden()
    alice.locator("#chat-input").press_sequentially("h")
    expect(bob.locator("#typing-indicator")).to_be_visible(timeout=2000)

    # No explicit "stop typing" event - the indicator times itself out after
    # a few seconds of no further "typing" pushes (TYPING_HIDE_MS in message.js).
    expect(bob.locator("#typing-indicator")).to_be_hidden(timeout=5000)


def test_typing_indicator_hides_immediately_once_message_arrives(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    chat_input = alice.locator("#chat-input")
    chat_input.press_sequentially("Hi Bob")
    expect(bob.locator("#typing-indicator")).to_be_visible(timeout=2000)

    chat_input.press("Enter")
    expect(bob.locator("#messages")).to_contain_text("Hi Bob")
    expect(bob.locator("#typing-indicator")).to_be_hidden()


def test_document_title_flags_unseen_message_when_tab_unfocused(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    default_title = bob.title()

    # Headless multi-context focus isn't something real OS window-manager
    # focus drives predictably, so force the check the app actually makes.
    bob.evaluate("() => { document.hasFocus = () => false; }")

    send_message(alice, "Hey Bob")
    expect(bob).to_have_title(re.compile(r"^\(1\) "), timeout=5000)

    bob.evaluate("() => window.dispatchEvent(new Event('focus'))")
    expect(bob).to_have_title(default_title)


def test_invite_modal_shows_room_url_and_copy_shows_toast(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")

    alice.click("#invite-button")
    expect(alice.locator("#walletAddress")).to_have_value(room_url)

    alice.click("#submitModalButton")  # "Copy URL"
    expect(alice.get_by_text("Copied to clipboard.")).to_be_visible()


def test_deleting_chat_redirects_both_peers_home(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    alice.click("#showDeleteChatModal")
    expect(alice.get_by_text("Confirm deletion?")).to_be_visible()
    alice.click("#submitModalButton")  # "Delete chat"

    alice.wait_for_url(f"{base_url}/")
    bob.wait_for_url(f"{base_url}/", timeout=10000)


def test_delete_modal_cancel_keeps_the_room(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")

    alice.click("#showDeleteChatModal")
    expect(alice.get_by_text("Confirm deletion?")).to_be_visible()
    alice.click("#closeModalButton")  # "Cancel"

    expect(alice.get_by_text("Confirm deletion?")).to_be_hidden()
    assert alice.url == room_url


def test_verify_button_shows_matching_fingerprint_on_both_sides(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    expect(alice.locator("#verify-button")).to_be_hidden()  # no peer yet

    bob = make_page()
    join_room(bob, room_url, "Bob")

    expect(alice.locator("#verify-button")).to_be_visible(timeout=15000)
    expect(bob.locator("#verify-button")).to_be_visible(timeout=15000)

    alice.click("#verify-button")
    bob.click("#verify-button")

    alice_fingerprint = alice.locator("#fingerprintModal .font-mono").inner_text()
    bob_fingerprint = bob.locator("#fingerprintModal .font-mono").inner_text()

    assert alice_fingerprint == bob_fingerprint
    assert alice_fingerprint.count("-") == 7  # 8 groups of 4 hex chars


def test_verify_fingerprint_survives_a_refresh(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")

    expect(alice.locator("#verify-button")).to_be_visible(timeout=15000)
    alice.click("#verify-button")
    fingerprint_before = alice.locator("#fingerprintModal .font-mono").inner_text()
    alice.click("#closeModalButton")

    alice.reload()
    expect(alice.locator("#verify-button")).to_be_visible(timeout=15000)
    alice.click("#verify-button")
    fingerprint_after = alice.locator("#fingerprintModal .font-mono").inner_text()

    assert fingerprint_before == fingerprint_after


def test_third_user_is_denied_when_room_is_full(make_page, base_url):
    alice = make_page()
    room_url = create_room(alice, base_url, "Alice")
    bob = make_page()
    join_room(bob, room_url, "Bob")
    wait_for_send_ready(alice)
    wait_for_send_ready(bob)

    charlie = make_page()
    charlie.goto(room_url)
    charlie.get_by_placeholder("Username").fill("Charlie")
    charlie.click("#submitModalButton")

    # The channel join is rejected and the client redirects home immediately,
    # so the "Failed to connect" toast can disappear (page navigates away)
    # before we get a chance to assert on it - the redirect itself is proof.
    charlie.wait_for_url(f"{base_url}/", timeout=10000)
