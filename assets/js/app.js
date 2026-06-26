import "phoenix_html";
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";
import { usernameForm } from "./username.js";
import { redirectUserToChat, checkAndConnect, showDeleteChatModal } from "./chat.js";
import { copyChatUrl } from "./link.js";
import { handshake } from "./handshake.js";
import { sendAndReceiveMessages, sendMessage } from "./message.js";
import { donateModal } from "./donate.js";
function initLiveSocket() {
    const csrfToken = document
        .querySelector("meta[name='csrf-token']")
        .getAttribute("content");
    if (!csrfToken) throw new Error("Missing CSRF meta tag");
    const liveSocket = new LiveSocket("/live", Socket, {
        // longPollFallbackMs reduces WebSocket timeout before falling back to long-polling
        longPollFallbackMs: 2500,
        params: { _csrf_token: csrfToken },
    });
    liveSocket.connect();
    return liveSocket;
}
function initProgressBar() {
    topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
    window.addEventListener("phx:page-loading-start", () => topbar.show(300));
    window.addEventListener("phx:page-loading-stop", () => topbar.hide());
}
function registerGlobals(liveSocket) {
    const api = {
        liveSocket,
        sendMessage,
        sendAndReceiveMessages,
        handshake,
        copyChatUrl,
        usernameForm,
        showDeleteChatModal,
        redirectUserToChat,
        checkAndConnect,
        donateModal,
    };
    Object.assign(window, api);
}
function easterEgg() {
    console.log(
        '%cCaught ya!',
        'font-weight:bold;font-size:100px;color:violet;'
        + 'text-shadow:3px 3px 0 rgb(255,128,197),6px 6px 0 rgb(122,251,255),'
        + '9px 9px 0 rgb(145,170,255),12px 12px 0 rgb(255,158,158),'
        + '15px 15px 0 rgb(138,255,156),18px 18px 0 rgb(4,77,145),'
        + '21px 21px 0 rgb(42,21,113)'
    );
}
// ---
const liveSocket = initLiveSocket();
initProgressBar();
registerGlobals(liveSocket);
easterEgg();