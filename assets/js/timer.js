import { showToast } from "./toast";
import { openModal, modalShell, BTN_SECONDARY } from "./modal";
const TIMER_ICON = `
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
  </svg>
`;
const OPTIONS = [
	{ minutes: 0, label: "Off" },
	{ minutes: 10, label: "10 min" },
	{ minutes: 30, label: "30 min" },
	{ minutes: 60, label: "60 min" },
];
const OPTION_BUTTON_CLASS =
	"rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-white " +
	"transition hover:border-violet-500 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500";
// --- module state ---
let currentChannel;
let countdownInterval;
let expiresAt = null;
function formatRemaining(ms) {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function updateDisplays() {
	const label = document.getElementById("timer-label");
	const mobileCountdown = document.getElementById("timer-mobile-countdown");
	if (!expiresAt) {
		if (label) label.textContent = "Timer";
		mobileCountdown?.classList.add("hidden");
		return;
	}
	const remaining = expiresAt - Date.now();
	if (remaining <= 0) {
		clearInterval(countdownInterval);
	}
	const text = formatRemaining(remaining);
	if (label) label.textContent = text;
	if (mobileCountdown) {
		mobileCountdown.textContent = `Auto-deletes in ${text}`;
		mobileCountdown.classList.remove("hidden");
	}
}
function startCountdown(ms) {
	clearInterval(countdownInterval);
	if (!ms) {
		expiresAt = null;
		updateDisplays();
		return;
	}
	expiresAt = Date.now() + ms;
	updateDisplays();
	countdownInterval = setInterval(updateDisplays, 1000);
}
function handleTimerSet(payload) {
	startCountdown(payload.ms);
}
function showTimerModal() {
	const options = OPTIONS.map(
		({ minutes, label }) =>
			`<button data-minutes="${minutes}" class="${OPTION_BUTTON_CLASS}">${label}</button>`,
	).join("");
	const body = `
    <p class="mb-4 text-sm text-gray-400">
      Automatically delete this room after a set time, no matter what.
    </p>
    <div class="mb-4 grid grid-cols-2 gap-2">${options}</div>
    <div class="flex justify-end">
      <button id="closeModalButton" class="${BTN_SECONDARY}">Cancel</button>
    </div>
  `;
	const { close, container } = openModal(
		"timerModal",
		modalShell(TIMER_ICON, "Self-destruct timer", body),
	);
	document.getElementById("closeModalButton").addEventListener("click", close);
	container.querySelectorAll("[data-minutes]").forEach((button) => {
		button.addEventListener("click", () => {
			const minutes = Number(button.dataset.minutes);
			try {
				currentChannel.push("set_timer", { minutes });
			} catch (_) {
				showToast("Failed to set timer!", "danger");
			}
			close();
		});
	});
}
function initTimer(channel) {
	currentChannel = channel;
	channel.on("timer_set", handleTimerSet);
	document.getElementById("timer-button")?.addEventListener("click", showTimerModal);
}
export { initTimer };
