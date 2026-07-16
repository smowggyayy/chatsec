import { openModal, modalShell, BTN_SECONDARY } from "./modal";

let currentFingerprint = null;

const FINGERPRINT_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"/>
  </svg>
`;

function setFingerprint(fingerprint) {
	currentFingerprint = fingerprint;
	document.getElementById("verify-button")?.classList.remove("hidden");
}

function showFingerprintModal() {
	if (!currentFingerprint) return;
	const body = `
    <p class="mb-4 text-sm text-gray-400">
      Read this code out to the other person over a call, in person, or
      any channel you trust. If it matches on both ends, nobody is
      intercepting your connection.
    </p>
    <div class="mb-4 w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-center font-mono text-sm text-violet-300 break-all">
      ${currentFingerprint}
    </div>
    <div class="flex justify-end">
      <button id="closeModalButton" class="${BTN_SECONDARY}">Close</button>
    </div>
  `;
	const { close } = openModal(
		"fingerprintModal",
		modalShell(FINGERPRINT_ICON, "Verify this chat", body),
	);
	document.getElementById("closeModalButton").addEventListener("click", close);
}

export { setFingerprint, showFingerprintModal };
