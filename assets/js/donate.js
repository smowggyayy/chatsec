import { copyToClipboard } from "./link";
const DONATE_ADDRESS =
  "49ibYHn3jesXrgykLqRc1o5vgUC5gizRuRpYvBYy1TKYPjAfPNgHQ91iTafViAFYMbb7AitUcmiiEcRVqywxT1BoBcUtC2C";
function donateModal() {
  const portal = document.getElementById("portal");
  const root = document.getElementById("root");
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="copyUrlModal" class="modal fixed inset-0 flex items-center justify-center z-50">
      <div class="p-8 bg-gray-900 rounded-lg max-w-sm w-full">
        <h2 class="text-2xl font-bold text-white mb-4">Donate? &#x1F920;</h2>
        <div class="mb-4">
          <input type="text" id="chatUrl"
                 value="${DONATE_ADDRESS}"
                 class="w-full p-2 border focus:outline-none focus:ring-2
                        focus:ring-orange-600 focus:border-transparent bg-gray-800
                        text-white placeholder-gray-500 rounded-md" readonly>
        </div>
        <div class="flex justify-end">
          <button id="closeModalButton"
                  class="bg-gray-500 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded mr-2
                         transition duration-200 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 shadow-md">
            Close
          </button>
          <button id="submitModalButton"
                  class="bg-orange-600 hover:bg-orange-800 text-white font-bold py-2 px-4 rounded
                         transition duration-200 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 shadow-md">
            Copy address
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
  container.querySelector("#submitModalButton").addEventListener("click", () => {
    copyToClipboard(DONATE_ADDRESS);
    closeModal();
  });
}
export { donateModal };
