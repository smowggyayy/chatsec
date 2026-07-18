import { handshake } from "./handshake";
import { encryptMessage, decryptMessage } from "./encrypt";
import { showToast } from "./toast";
const USERNAME_KEY = "username";
const SELF_COLOR = "rgb(138, 255, 156)";
const OTHER_COLOR = "rgb(255, 128, 197)";
// How often we'll push a "typing" event while the peer is actively typing,
// and how long their indicator stays up after the last one we received.
const TYPING_THROTTLE_MS = 2_000;
const TYPING_HIDE_MS = 3_000;
const DEFAULT_TITLE = document.title;
// --- module state ---
let secretKey;
let currentChannel;
let currentUsername;
let currentMessagesContainer;
let currentFingerprint;
let initialized = false;
let lastTypingSentAt = 0;
let typingHideTimeout;
let unseenCount = 0;
// --- dom helpers ---
function buildMessageEl(messageUsername, isSelf) {
	const usernameEl = document.createElement("span");
	usernameEl.className = `text-xs font-semibold mb-1.5 ${isSelf ? "text-right" : "text-left"}`;
	usernameEl.style.color = isSelf ? SELF_COLOR : OTHER_COLOR;
	usernameEl.innerText = messageUsername;
	const messageEl = document.createElement("p");
	messageEl.className = [
		"text-sm leading-relaxed break-words whitespace-pre-wrap px-3 py-2 rounded-2xl max-w-[75vw] md:max-w-sm shadow",
		isSelf
			? "bg-emerald-700 text-white rounded-br-sm"
			: "bg-gray-700 text-white rounded-bl-sm",
	].join(" ");
	const container = document.createElement("div");
	container.className = `flex flex-col ${isSelf ? "items-end" : "items-start"}`;
	container.appendChild(usernameEl);
	container.appendChild(messageEl);
	return { container, messageEl };
}
function renderMessage(messageUsername, text, isSelf) {
	const { container, messageEl } = buildMessageEl(messageUsername, isSelf);
	messageEl.innerText = text;
	currentMessagesContainer.appendChild(container);
	container.scrollIntoView({ behavior: "smooth", block: "end" });
}
function setTypingIndicatorVisible(visible) {
	document.getElementById("typing-indicator")?.classList.toggle("hidden", !visible);
}
function markUnseenMessage() {
	if (document.hasFocus()) return;
	unseenCount += 1;
	document.title = `(${unseenCount}) ${DEFAULT_TITLE}`;
}
function clearUnseenMessages() {
	if (unseenCount === 0) return;
	unseenCount = 0;
	document.title = DEFAULT_TITLE;
}
// --- event handlers ---
async function sendMessage(chatInput) {
	const msg = chatInput.value.trim();
	if (!msg) return;
	if (!secretKey || !currentChannel) {
		showToast("Still connecting, please wait...", "danger");
		return;
	}
	try {
		const { encryptedMessage, iv } = await encryptMessage(secretKey, msg, currentUsername);
		currentChannel.push("new_msg", {
			username: currentUsername,
			body: encryptedMessage,
			iv,
		});
		// The server only echoes this back to the other peer (broadcast_from!),
		// so render our own copy immediately instead of waiting on a round trip.
		renderMessage(currentUsername, msg, true);
		chatInput.value = "";
		chatInput.style.height = "40px";
	} catch (_) {
		showToast("Sending message failed!", "danger");
	}
}
async function handleKeyDown(event) {
	if (event.shiftKey || event.key !== "Enter") return;
	event.preventDefault();
	await sendMessage(event.currentTarget);
}
function handleTypingInput() {
	if (!secretKey || !currentChannel) return;
	const now = Date.now();
	if (now - lastTypingSentAt < TYPING_THROTTLE_MS) return;
	lastTypingSentAt = now;
	currentChannel.push("typing", {});
}
function handleTypingReceived() {
	setTypingIndicatorVisible(true);
	clearTimeout(typingHideTimeout);
	typingHideTimeout = setTimeout(() => setTypingIndicatorVisible(false), TYPING_HIDE_MS);
}
async function handleNewMsg(payload) {
	clearTimeout(typingHideTimeout);
	setTypingIndicatorVisible(false);
	if (!payload.body) {
		console.warn("Received message with no body", payload);
		return;
	}
	try {
		const decrypted = await decryptMessage(secretKey, payload.body, payload.iv, payload.username);
		renderMessage(payload.username, decrypted, false);
		markUnseenMessage();
	} catch (_) {
		showToast("Failed to decrypt message.", "danger");
	}
}
function handleRoomDeleted() {
	sessionStorage.removeItem(USERNAME_KEY);
	window.location.href = "/";
}
// --- public api ---
// Resolves to the connection fingerprint once ready, so the caller can
// surface it in the UI for out-of-band verification.
async function sendAndReceiveMessages(chatInput, username, channel, messagesContainer) {
	const channelOrUserChanged = currentChannel !== channel || currentUsername !== username;
	if (!secretKey || channelOrUserChanged) {
		const result = await handshake(null, channel, username);
		secretKey = result.secretKey;
		currentFingerprint = result.fingerprint;
		currentChannel = channel;
		currentUsername = username;
		initialized = false;
	}
	currentMessagesContainer = messagesContainer;
	if (!initialized) {
		chatInput.addEventListener("keydown", handleKeyDown);
		chatInput.addEventListener("input", handleTypingInput);
		channel.on("new_msg", handleNewMsg);
		channel.on("typing", handleTypingReceived);
		channel.on("room_deleted", handleRoomDeleted);
		window.addEventListener("focus", clearUnseenMessages);
		initialized = true;
	}
	return currentFingerprint;
}
export { sendAndReceiveMessages, sendMessage };
