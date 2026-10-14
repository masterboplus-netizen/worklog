// Worklog — криптография (Web Crypto API)
// PBKDF2 → AES-256-GCM
// Формат data.encrypted.json:
//   { salt: base64, iv: base64, data: base64 }
// Всё шифрование локально в браузере.

const PBKDF2_ITER = 100000;

function b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt', 'encrypt']
  );
}

async function decryptData(pin, encrypted) {
  const salt = b64ToBuf(encrypted.salt);
  const iv = b64ToBuf(encrypted.iv);
  const ciphertext = b64ToBuf(encrypted.data);
  const key = await deriveKey(pin, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  const text = new TextDecoder().decode(plainBuf);
  return JSON.parse(text);
}

async function encryptData(pin, obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))
  );
  return {
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    data: bufToB64(ciphertext)
  };
}
