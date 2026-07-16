const BTN_BASE =
	"font-bold px-4 py-2 rounded-lg transition duration-200 ease-in-out hover:scale-105 " +
	"focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-md";
const BTN_PRIMARY = `${BTN_BASE} bg-violet-500 hover:bg-violet-700 text-white focus:ring-violet-500`;
const BTN_SECONDARY = `${BTN_BASE} bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500`;
const BTN_DANGER = `${BTN_BASE} bg-pink-600 hover:bg-pink-700 text-white focus:ring-pink-500`;

const INPUT_CLASS =
	"w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white " +
	"placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500";

function modalShell(icon, title, bodyHtml) {
	return `
    <div class="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
          ${icon}
        </span>
        <h2 class="text-lg font-bold text-white">${title}</h2>
      </div>
      ${bodyHtml}
    </div>
  `;
}

// Renders inside a dark-tinted overlay layered over the already-blurred
// #root (see the blur-2xl toggle below) - the overlay itself doesn't need
// its own blur on top of that.
function openModal(id, innerHtml) {
	const portal = document.getElementById("portal");
	const root = document.getElementById("root");
	const container = document.createElement("div");
	container.innerHTML = `
    <div id="${id}" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      ${innerHtml}
    </div>
  `;
	portal.appendChild(container);
	root.classList.add("blur-2xl");
	function close() {
		portal.removeChild(container);
		root.classList.remove("blur-2xl");
	}
	return { container, close };
}

export { openModal, modalShell, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, INPUT_CLASS };
