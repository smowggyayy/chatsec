import { Socket, Presence } from "phoenix";
import { usernameForm, sanitizeInput } from "./username";
import { showToast } from "./toast";
const CHAT_USERNAME_KEY = "username";
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
  const socket = new Socket("/socket", { params: { username } });
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
  const portal = document.getElementById("portal");
  const root = document.getElementById("root");
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="deleteChatModal" class="modal fixed inset-0 flex items-center justify-center z-50">
      <div class="p-8 bg-gray-900 rounded-lg max-w-sm w-full">
        <h2 class="text-2xl font-bold text-white mb-4 text-center">Confirm deletion?</h2>
        <div class="flex justify-center mt-4">
          <button id="closeModalButton"
            class="bg-gray-500 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded mr-2
                   transition duration-200 ease-in-out transform hover:scale-105
                   focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 shadow-md">
            Cancel
          </button>
          <button id="submitModalButton"
            class="bg-pink-500 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded
                   transition duration-200 ease-in-out transform hover:scale-105
                   focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 shadow-md">
            Delete chat
          </button>
        </div>
      </div>
    </div>
  `;
  portal.appendChild(container);
  root.classList.add("blur-2xl");
  function closeModal() {
    portal.removeChild(container);
    root.classList.remove("blur-2xl");
  }
  container.querySelector("#closeModalButton").addEventListener("click", closeModal);
  container.querySelector("#submitModalButton").addEventListener("click", () => {
    deleteChat(channel, username);
    closeModal();
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