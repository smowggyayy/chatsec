import {
  importPublicKey,
  deriveSecretKey,
  generateKeyPair,
  exportPublicKey,
  computeFingerprint,
} from "./encrypt";
import { showToast } from "./toast";
const HANDSHAKE_TIMEOUT_MS = 30_000;
// --- base64 key serialisation ---
async function convertKeyToBase64(key) {
  const exported = await crypto.subtle.exportKey("raw", key);
  const bytes = new Uint8Array(exported);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function convertBase64ToKey(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
  return crypto.subtle.importKey(
    "raw",
    bytes.buffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
}
// --- handshake helpers ---
async function generateAndAddToMap(username, pubkeyMap) {
  const keyPair = await generateKeyPair();
  const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
  pubkeyMap.set(exportedPublicKey, username);
  return { keyPair, exportedPublicKey };
}
async function getAndConvertPublicKey(publicKey, username, pubkeyMap, privateKey) {
  pubkeyMap.set(publicKey, username);
  const converted = await importPublicKey(publicKey);
  return deriveSecretKey(privateKey, converted);
}
function syn(exportedPublicKey, username, channel) {
  try {
    channel.push("publickey", { publickey: exportedPublicKey, username });
  } catch (_) {
    showToast("Something went wrong, try again later.", "danger");
  }
}
function awaitAcknowledgement() {
  let resolve;
  let timeoutId;
  const promise = new Promise((res, rej) => {
    resolve = res;
    timeoutId = setTimeout(
      () => rej(new Error("Handshake timed out.")),
      HANDSHAKE_TIMEOUT_MS,
    );
  });
  function acknowledge() {
    clearTimeout(timeoutId);
    resolve();
  }
  return { promise, acknowledge };
}
// --- public api ---
// Resolves to { secretKey, fingerprint }. The fingerprint lets both people
// confirm out of band that they derived a key with each other and not a
// relay sitting in the middle of the exchange.
async function handshake(value, channel, username) {
  const uuid = window.location.href.split("/").at(-1);
  const cached = value ?? sessionStorage.getItem(uuid);
  if (cached) {
    try {
      const { secretKeyBase64, fingerprint } = JSON.parse(cached);
      if (secretKeyBase64 && fingerprint) {
        return { secretKey: await convertBase64ToKey(secretKeyBase64), fingerprint };
      }
    } catch (_) {
      // fall through to a fresh handshake below
    }
  }
  const pubkeyMap = new Map();
  const { keyPair, exportedPublicKey } = await generateAndAddToMap(username, pubkeyMap);
  const { promise, acknowledge } = awaitAcknowledgement();
  let secretKey;
  let peerPublicKey;
  channel.on("publickey", async (payload) => {
    const { publickey: pubkey, username: user } = payload;
    if (user === username || pubkeyMap.has(pubkey)) return;
    try {
      secretKey = await getAndConvertPublicKey(pubkey, user, pubkeyMap, keyPair.privateKey);
      peerPublicKey = pubkey;
      syn(exportedPublicKey, username, channel);
      acknowledge();
    } catch (_) {
      showToast("Handshake failed — could not derive secret.", "danger");
    }
  });
  syn(exportedPublicKey, username, channel);
  try {
    await promise;
  } catch (err) {
    showToast("Handshake timed out. Please refresh.", "danger");
    throw err;
  }
  showToast("Handshake completed!", "success");
  const fingerprint = await computeFingerprint(exportedPublicKey, peerPublicKey);
  const secretKeyBase64 = await convertKeyToBase64(secretKey);
  sessionStorage.setItem(uuid, JSON.stringify({ secretKeyBase64, fingerprint }));
  return { secretKey, fingerprint };
}
export { handshake };