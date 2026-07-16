import { copyToClipboard } from "./link";
import { openModal, modalShell, BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS } from "./modal";
const DONATE_ADDRESS =
  "49ibYHn3jesXrgykLqRc1o5vgUC5gizRuRpYvBYy1TKYPjAfPNgHQ91iTafViAFYMbb7AitUcmiiEcRVqywxT1BoBcUtC2C";
const HEART_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
  </svg>
`;
function donateModal() {
  const body = `
    <p class="mb-4 text-sm text-gray-400">
      ChatSec is free and open-source. If it's useful to you, a small tip is always appreciated.
    </p>
    <input type="text" id="chatUrl"
           value="${DONATE_ADDRESS}"
           class="${INPUT_CLASS} mb-4" readonly>
    <div class="flex justify-end gap-2">
      <button id="closeModalButton" class="${BTN_SECONDARY}">Close</button>
      <button id="submitModalButton" class="${BTN_PRIMARY}">Copy address</button>
    </div>
  `;
  const { close } = openModal("copyUrlModal", modalShell(HEART_ICON, "Donate?", body));
  document.getElementById("closeModalButton").addEventListener("click", close);
  document.getElementById("submitModalButton").addEventListener("click", () => {
    copyToClipboard(DONATE_ADDRESS);
    close();
  });
}
export { donateModal };
