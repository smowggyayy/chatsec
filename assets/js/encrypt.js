import { showToast } from "./toast";
// --- base64 helpers ---
function encodeBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function decodeBase64(base64) {
  const binary = atob(base64);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}
// --- key generation & derivation ---
async function generateKeyPair() {
  try {
    return await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-384" },
      true,
      ["deriveKey"],
    );
  } catch (_) {
    showToast("Generating keys failed!", "danger");
    throw
  }
}
async function deriveSecretKey(privateKey, publicKey) {
  try {
    return await crypto.subtle.deriveKey(
      { name: "ECDH", public: publicKey },
      privateKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (_) {
    showToast("Deriving shared secret failed.", "danger");
    throw
  }
}
// --- encryption & decryption ---
async function encryptMessage(secretKey, message) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      secretKey,
      encoded,
    );
    return { encryptedMessage: encodeBase64(encrypted), iv: encodeBase64(iv) };
  } catch (_) {
    showToast("Failed to encrypt message!", "danger");
    throw
  }
}
async function decryptMessage(secretKey, encryptedMessage, ivBase64) {
  try {
    const iv = decodeBase64(ivBase64);
    const decoded = decodeBase64(encryptedMessage);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      secretKey,
      decoded,
    );
    return new TextDecoder().decode(decrypted);
  } catch (_) {
    showToast("Failed to decrypt message.", "danger");
    throw
  }
}
// --- key import & export ---
async function exportPublicKey(key) {
  const exported = await crypto.subtle.exportKey("spki", key);
  return encodeBase64(exported);
}
async function importPublicKey(base64) {
  const binaryDer = decodeBase64(base64);
  return crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "ECDH", namedCurve: "P-384" },
    true,
    [],
  );
}
export {
  generateKeyPair,
  deriveSecretKey,
  encryptMessage,
  decryptMessage,
  exportPublicKey,
  importPublicKey,
};