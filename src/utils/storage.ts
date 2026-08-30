import CryptoJS from 'crypto-js';

const PREFIX = 'adapted_';
const SENSITIVE_KEYS = ['session', 'userProfile', 'chatHistory', 'notes'];

function getEncryptionKey(): string {
  const envKey = import.meta.env.VITE_ENCRYPTION_SECRET;
  if (envKey && typeof envKey === 'string' && envKey.trim().length >= 16) {
    return envKey.trim();
  }
  const stored = localStorage.getItem(PREFIX + '_ek');
  if (stored && stored.length >= 32) {
    try {
      return atob(stored);
    } catch {
      // ignore
    }
  }
  const generated = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  try {
    localStorage.setItem(PREFIX + '_ek', btoa(generated));
  } catch {
    // ignore quota errors
  }
  return generated;
}

const ENCRYPTION_KEY = (() => {
  try {
    return getEncryptionKey();
  } catch {
    return 'adapted-fallback-key-2024';
  }
})();

function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s.toLowerCase()));
}

function encrypt(value: string): string {
  try {
    return 'ENC::' + CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
  } catch {
    return value;
  }
}

function decrypt(value: string): string {
  if (!value.startsWith('ENC::')) return value;
  try {
    const ciphertext = value.slice(5);
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    if (result.length === 0) return value;
    return result;
  } catch {
    return value;
  }
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const toParse = isSensitive(key) ? decrypt(raw) : raw;
    return JSON.parse(toParse) as T;
  } catch {
    return fallback;
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    const toStore = isSensitive(key) ? encrypt(json) : json;
    localStorage.setItem(PREFIX + key, toStore);
  } catch {
    // ignore quota errors or serialization failures
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX) && k !== PREFIX + '_ek')
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function exportUserData(): string {
  try {
    const data: Record<string, unknown> = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX) && k !== PREFIX + '_ek')
      .forEach(k => {
        const shortKey = k.slice(PREFIX.length);
        const raw = localStorage.getItem(k);
        if (raw !== null) {
          const toParse = isSensitive(shortKey) ? decrypt(raw) : raw;
          try {
            data[shortKey] = JSON.parse(toParse);
          } catch {
            data[shortKey] = toParse;
          }
        }
      });
    return JSON.stringify(data, null, 2);
  } catch {
    return '{}';
  }
}

export function importUserData(json: string): boolean {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    Object.entries(data).forEach(([key, value]) => {
      saveState(key, value);
    });
    return true;
  } catch {
    return false;
  }
}
