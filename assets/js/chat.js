import { Socket, Presence } from "phoenix";
import { usernameForm, sanitizeInput } from "./username";
import { showToast } from "./toast";
import { openModal, modalShell, BTN_DANGER, BTN_SECONDARY } from "./modal";
const CHAT_USERNAME_KEY = "username";
const TRASH_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
  </svg>
`;
function redirectUserToChat() {
  window.location.href = "/chat/create";
}
function renderOnlineUsers(presence) {
  const svgIcon = `
    <svg class="w-6 h-6 text-emerald-500 inline-block mr-2" aria-hidden="true"
         xmlns="http://www.w3.org/2000/svg" width="24" height="24"
         fill="currentColor" viewBox="0 0 24 24">
      <path fill-rule="evenodd"
            d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8
               a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/>  </svg>
  `;
  const userList = [];
  presence.list((id) => {
    userList.push(sanitizeInput(id));
  });
  const usernamesDiv = document.getElementById("usernames");
  usernamesDiv.innerHTML = "";
  for (const username of userList) {
    const li = document.createElement("li");
    li.className = "flex items-center";
    li.innerHTML = svgIcon;
    li.appendChild(document.createTextNode(username));
    usernamesDiv.appendChild(li);
  }
}
function checkAndConnect(value, callback) {
  const username = value ?? sessionStorage.getItem(CHAT_USERNAME_KEY);
  if (!username) {
    usernameForm()
      .then((resolvedUsername) => {
        sessionStorage.setItem(CHAT_USERNAME_KEY, resolvedUsername);
        connectToChannel(resolvedUsername, callback);
      })
      .catch(() => {
        showToast("Unable to get username.", "danger");
      });
    return;
  }
  connectToChannel(username, callback);
}
function connectToChannel(username, callback) {
  // Paired with the shorter server-side idle timeout (endpoint.ex) so a
  // dropped connection is noticed - and the room slot freed - faster.
  const socket = new Socket("/socket", { params: { username }, heartbeatIntervalMs: 15_000 });
  socket.connect();
  const uuid = window.location.href.split("/").at(-1);
  const channel = socket.channel(`room:${uuid}`, { username });
  const presence = new Presence(channel);
  presence.onSync(() => renderOnlineUsers(presence));
  channel
    .join()
    .receive("ok", () => {
      showToast("Connected to channel.", "success");
      callback?.(channel, username);
    })
    .receive("error", () => {
      showToast("Failed to connect. Returning home.", "danger");
      window.location.href = "/";
    });
  window.channel = channel;
  return { channel, username };
}
function showDeleteChatModal(channel, username) {
  const body = `
    <p class="mb-4 text-sm text-gray-400">
      This deletes the room for both of you and can't be undone.
    </p>
    <div class="flex justify-end gap-2">
      <button id="closeModalButton" class="${BTN_SECONDARY}">Cancel</button>
      <button id="submitModalButton" class="${BTN_DANGER}">Delete chat</button>
    </div>
  `;
  const { close } = openModal("deleteChatModal", modalShell(TRASH_ICON, "Confirm deletion?", body));
  document.getElementById("closeModalButton").addEventListener("click", close);
  document.getElementById("submitModalButton").addEventListener("click", () => {
    deleteChat(channel, username);
    close();
  });
}
function deleteChat(channel, username) {
  try {
    channel.push("adios", { username });
  } catch {
    showToast("Deleting room failed!", "danger");
  }
  sessionStorage.removeItem(CHAT_USERNAME_KEY);
  window.location.href = "/";
}
export { redirectUserToChat, showDeleteChatModal, checkAndConnect };