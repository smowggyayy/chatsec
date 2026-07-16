import { showToast } from "./toast";
import { openModal, modalShell, BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS } from "./modal";
const LINK_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
  </svg>
`;
async function copyToClipboard(url) {
	try {
		await navigator.clipboard.writeText(url);
		showToast("Copied to clipboard.", "success");
	} catch (_) {
		showToast("Failed to copy!", "danger");
	}
}
function copyChatUrl() {
	const url = location.href;
	const body = `
    <input type="text" id="walletAddress"
           value="${url}"
           class="${INPUT_CLASS} mb-4" readonly>
    <div class="flex justify-end gap-2">
      <button id="closeModalButton" class="${BTN_SECONDARY}">Cancel</button>
      <button id="submitModalButton" class="${BTN_PRIMARY}">Copy URL</button>
    </div>
  `;
	const { close } = openModal("copyUrlModal", modalShell(LINK_ICON, "Invite users", body));
	document.getElementById("closeModalButton").addEventListener("click", close);
	document.getElementById("submitModalButton").addEventListener("click", () => {
		copyToClipboard(url);
		close();
	});
}
export { copyToClipboard, copyChatUrl };
