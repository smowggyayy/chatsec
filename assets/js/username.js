import { showToast } from "./toast";
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
		const portal = document.getElementById("portal");
		const root = document.getElementById("root");
		const container = document.createElement("div");
		container.innerHTML = `
      <div id="usernameModal" class="modal fixed inset-0 flex items-center justify-center blur-none z-50">
        <div class="p-8 bg-gray-900 rounded-lg max-w-sm w-full blur-none">
          <h2 class="text-2xl font-bold text-white mb-4">Enter Username</h2>
          <input type="text" id="usernameInput" maxlength="32"
                 class="w-full p-2 border focus:outline-none focus:ring-2 focus:ring-green-500
                        focus:border-transparent bg-gray-800 text-white placeholder-gray-500 rounded-md mb-4"
                 placeholder="Username">
          <div class="flex justify-end">
            <button id="closeModalButton"
                    class="bg-pink-500 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded mr-2
                           transition duration-200 ease-in-out transform hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 shadow-md">
              Cancel
            </button>
            <button id="randomModalButton"
                    class="bg-violet-500 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded mr-2
                           transition duration-200 ease-in-out transform hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 shadow-md">
              Random
            </button>
            <button id="submitModalButton"
                    class="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded
                           transition duration-200 ease-in-out transform hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 shadow-md">
              Submit
            </button>
          </div>
        </div>
      </div>
    `;
		portal.appendChild(container);
		root.classList.add("blur-2xl");
		const input = container.querySelector("#usernameInput");
		function closeModal() {
			portal.removeChild(container);
			root.classList.remove("blur-2xl");
		}
		function submitUsername() {
			const username = sanitizeInput(input.value);
			if (!username) {
				showToast("Please enter a username.", "danger");
				return;
			}
			closeModal();
			resolve(username);
			showToast("Username set.", "success");
		}
		container.querySelector("#randomModalButton").addEventListener("click", () => {
			input.value = createRandomUsername();
		});
		container.querySelector("#closeModalButton").addEventListener("click", () => {
			reject(new Error("Username not set."));
			showToast("Username not set.", "danger");
			closeModal();
		});
		container.querySelector("#submitModalButton").addEventListener("click", submitUsername);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") submitUsername();
		});
	});
}
export { usernameForm, sanitizeInput };