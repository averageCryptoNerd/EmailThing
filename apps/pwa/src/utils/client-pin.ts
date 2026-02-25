export const CLIENT_PIN_HASH_KEY = "mail-client-pin-hash";

export const PIN_REGEX = /^\d{4,10}$/;

let clientPinUnlocked = false;

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(hash);
}

export function hasClientPin() {
  if (!canUseBrowserStorage()) return false;
  return Boolean(localStorage.getItem(CLIENT_PIN_HASH_KEY));
}

export function isClientPinUnlocked() {
  if (!canUseBrowserStorage()) return true;
  return clientPinUnlocked;
}

export function setClientPinUnlocked(unlocked: boolean) {
  clientPinUnlocked = unlocked;
}

export async function setClientPin(pin: string) {
  const normalizedPin = pin.trim();
  if (!PIN_REGEX.test(normalizedPin)) {
    throw new Error("PIN must be 4-10 digits.");
  }

  const hash = await hashPin(normalizedPin);
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(CLIENT_PIN_HASH_KEY, hash);
  setClientPinUnlocked(true);
}

export async function verifyClientPin(pin: string) {
  if (!canUseBrowserStorage()) return true;
  const stored = localStorage.getItem(CLIENT_PIN_HASH_KEY);
  if (!stored) return true;
  const hashedInput = await hashPin(pin.trim());
  return stored === hashedInput;
}

export function clearClientPin() {
  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(CLIENT_PIN_HASH_KEY);
  setClientPinUnlocked(false);
}
