import { showToast } from "./toast";
import { openModal, modalShell, BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS } from "./modal";
// --- constants ---
const ADJECTIVES = [
	"aggressive", "angry", "bored", "busy", "cautious",
	"disturbed", "dead", "cruel", "creepy", "elite",
	"fair", "envious", "good", "powerful", "rich",
	"strange", "sweet", "wicked", "pleasant", "talented",
];
const NAMES = [
	"aamon", "paimon", "baal", "baphomet", "lucifer",
	"mammon", "asmodeus", "leviathan", "beelzebub", "azazel",
	"belphegor", "legion", "oriax", "phenex", "raum",
	"vapula", "sitri", "naberus", "foraii", "gemory",
];
const USER_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
  </svg>
`;
// --- helpers ---
function capitalize(word) {
	return word[0].toUpperCase() + word.slice(1);
}
function randomItem(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}
function sanitizeInput(input) {
	return input
		.replace(/<\/?[^>]+(>|$)/g, "")
		.replace(/[^a-zA-Z0-9 ]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}
function createRandomUsername() {
	return capitalize(randomItem(ADJECTIVES)) + capitalize(randomItem(NAMES));
}
// --- modal ---
function usernameForm() {
	return new Promise((resolve, reject) => {
		const body = `
      <input type="text" id="usernameInput" maxlength="32"
             class="${INPUT_CLASS} mb-4"
             placeholder="Username">
      <div class="flex justify-end gap-2">
        <button id="closeModalButton" class="${BTN_SECONDARY}">Cancel</button>
        <button id="randomModalButton" class="${BTN_SECONDARY}">Random</button>
        <button id="submitModalButton" class="${BTN_PRIMARY}">Submit</button>
      </div>
    `;
		const { container, close } = openModal(
			"usernameModal",
			modalShell(USER_ICON, "Enter username", body),
		);
		const input = container.querySelector("#usernameInput");
		function submitUsername() {
			const username = sanitizeInput(input.value);
			if (!username) {
				showToast("Please enter a username.", "danger");
				return;
			}
			close();
			resolve(username);
			showToast("Username set.", "success");
		}
		container.querySelector("#randomModalButton").addEventListener("click", () => {
			input.value = createRandomUsername();
		});
		container.querySelector("#closeModalButton").addEventListener("click", () => {
			reject(new Error("Username not set."));
			showToast("Username not set.", "danger");
			close();
		});
		container.querySelector("#submitModalButton").addEventListener("click", submitUsername);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") submitUsername();
		});
	});
}
export { usernameForm, sanitizeInput };
