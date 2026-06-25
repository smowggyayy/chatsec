const TOAST_DURATION_MS = 2000;
const TOAST_TYPES = {
	success: {
		iconBgClass: "bg-emerald-100 dark:bg-emerald-800 text-emerald-500 dark:text-emerald-200",
		icon: `
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
           fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0
               l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
      </svg>
    `,
	},
	danger: {
		iconBgClass: "bg-pink-100 dark:bg-pink-800 text-pink-500 dark:text-pink-200",
		icon: `
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
           fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414
               L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414
               L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z"/>
      </svg>
    `,
	},
};
function getOrCreateContainer() {
	const existing = document.getElementById("toast-container");
	if (existing) return existing;
	const container = document.createElement("div");
	container.id = "toast-container";
	container.className = "fixed bottom-4 right-4 space-y-2 z-50";
	document.body.appendChild(container);
	return container;
}
function showToast(message, type) {
	const config = TOAST_TYPES[type];
	if (!config) {
		console.warn(`showToast: unknown type "${type}"`);
		return;
	}
	const safeMessage = document.createTextNode(message);
	const iconEl = document.createElement("div");
	iconEl.className = `inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${config.iconBgClass}`;
	iconEl.innerHTML = config.icon + `<span class="sr-only">Icon</span>`;
	const messageEl = document.createElement("div");
	messageEl.className = "ms-3 text-sm font-normal";
	messageEl.appendChild(safeMessage);
	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.setAttribute("aria-label", "Close");
	closeBtn.className = "bg-white ml-2 text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1 hover:bg-gray-100 inline-flex items-center justify-center h-7 w-7 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700";
	closeBtn.innerHTML = `
    <span class="sr-only">Close</span>
    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
    </svg>
  `;
	const toast = document.createElement("div");
	toast.className = "flex items-center w-full max-w-xs p-4 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800";
	toast.appendChild(iconEl);
	toast.appendChild(messageEl);
	toast.appendChild(closeBtn);
	const dismiss = () => toast.remove();
	closeBtn.onclick = dismiss;
	setTimeout(dismiss, TOAST_DURATION_MS);
	getOrCreateContainer().appendChild(toast);
}
export { showToast };