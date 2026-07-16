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
  } catch (err) {
    showToast("Generating keys failed!", "danger");
    throw err;
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
  } catch (err) {
    showToast("Deriving shared secret failed.", "danger");
    throw err;
  }
}
// --- encryption & decryption ---
// associatedUsername is authenticated (bound into the GCM tag) but not
// encrypted - it stops a tampering relay from relabeling whose message this
// is without invalidating decryption, without needing to hide who sent it.
async function encryptMessage(secretKey, message, associatedUsername) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(associatedUsername),
      },
      secretKey,
      encoded,
    );
    return { encryptedMessage: encodeBase64(encrypted), iv: encodeBase64(iv) };
  } catch (err) {
    showToast("Failed to encrypt message!", "danger");
    throw err;
  }
}
async function decryptMessage(secretKey, encryptedMessage, ivBase64, associatedUsername) {
  try {
    const iv = decodeBase64(ivBase64);
    const decoded = decodeBase64(encryptedMessage);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(associatedUsername),
      },
      secretKey,
      decoded,
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    showToast("Failed to decrypt message.", "danger");
    throw err;
  }
}
// --- connection fingerprint ---
// A short, human-comparable code derived from both sides' public keys, so
// two people can confirm (out of band - voice call, in person, etc.) that
// they each derived a shared secret with EACH OTHER and not with a relay
// sitting in the middle of the handshake. Sorting before hashing makes the
// result identical regardless of which side computes it first.
async function computeFingerprint(publicKeyA, publicKeyB) {
  const combined = [publicKeyA, publicKeyB].sort().join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(combined));
  const bytes = new Uint8Array(digest).slice(0, 16);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.match(/.{1,4}/g).join("-");
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
  computeFingerprint,
};