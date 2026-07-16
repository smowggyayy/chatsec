let currentFingerprint = null;

function setFingerprint(fingerprint) {
	currentFingerprint = fingerprint;
	document.getElementById("verify-button")?.classList.remove("hidden");
}

function showFingerprintModal() {
	if (!currentFingerprint) return;
	const portal = document.getElementById("portal");
	const root = document.getElementById("root");
	const container = document.createElement("div");
	container.innerHTML = `
    <div id="fingerprintModal" class="modal fixed inset-0 flex items-center justify-center z-50">
      <div class="p-8 bg-gray-900 rounded-lg max-w-sm w-full">
        <h2 class="text-2xl font-bold text-white mb-4">Verify this chat</h2>
        <p class="text-sm text-gray-400 mb-4">
          Read this code out to the other person over a call, in person, or
          any channel you trust. If it matches on both ends, nobody is
          intercepting your connection.
        </p>
        <div class="w-full p-3 bg-gray-800 text-emerald-400 font-mono text-center text-sm rounded-md mb-4 break-all">
          ${currentFingerprint}
        </div>
        <div class="flex justify-end">
          <button id="closeModalButton"
                  class="bg-pink-500 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded
                         transition duration-200 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 shadow-md">
            Close
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
}

export { setFingerprint, showFingerprintModal };
