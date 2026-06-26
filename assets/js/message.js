import { handshake } from "./handshake";
import { encryptMessage, decryptMessage } from "./encrypt";
import { showToast } from "./toast";
const USERNAME_KEY = "username";
const SELF_COLOR = "rgb(138, 255, 156)";
const OTHER_COLOR = "rgb(255, 128, 197)";
// --- module state ---
let secretKey;
let currentChannel;
let currentUsername;
let initialized = false;
// --- dom helpers ---
function buildMessageEl(payload, username) {
	const isSelf = payload.username === username;
	const usernameEl = document.createElement("span");
	usernameEl.className = "username";
	usernameEl.innerText = payload.username;
	usernameEl.style.color = isSelf ? SELF_COLOR : OTHER_COLOR;
	const messageEl = document.createElement("p");
	messageEl.className = "max-w-full break-words";
	const container = document.createElement("div");
	container.className = `flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`;
	container.appendChild(usernameEl);
	container.appendChild(messageEl);
	return { container, messageEl };
}
// --- event handlers ---
async function sendMessage(chatInput) {
	const msg = chatInput.value.trim();
	if (!msg) return;
	try {
		const { encryptedMessage, iv } = await encryptMessage(secretKey, msg);
		currentChannel.push("new_msg", {
			username: currentUsername,
			body: encryptedMessage,
			iv,
		});
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
async function handleNewMsg(payload, username, messagesContainer) {
	if (!payload.body) {
		console.warn("Received message with no body", payload);
		return;
	}
	try {
		const decrypted = await decryptMessage(secretKey, payload.body, payload.iv);
		const { container, messageEl } = buildMessageEl(payload, username);
		messageEl.innerText = decrypted;
		messagesContainer.appendChild(container);
	} catch (_) {
		showToast("Failed to decrypt message.", "danger");
	}
}
function handleRoomDeleted() {
	sessionStorage.removeItem(USERNAME_KEY);
	window.location.href = "/";
}
// --- public api ---
async function sendAndReceiveMessages(chatInput, username, channel, messagesContainer) {
	const channelOrUserChanged = currentChannel !== channel || currentUsername !== username;
	if (!secretKey || channelOrUserChanged) {
		secretKey = await handshake(null, channel, username);
		currentChannel = channel;
		currentUsername = username;
		initialized = false;
	}
	if (!initialized) {
		chatInput.addEventListener("keydown", handleKeyDown);
		channel.on("new_msg", (payload) => handleNewMsg(payload, username, messagesContainer));
		channel.on("room_deleted", handleRoomDeleted);
		initialized = true;
	}
}
export { sendAndReceiveMessages, sendMessage };