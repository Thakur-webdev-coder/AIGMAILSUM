const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode UTF-8 text without Node Buffer or platform-specific globals.
 * Empty input is valid. Invalid Base64/padding/UTF-8 returns null.
 */
export function decodeBase64Url(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(value)) {
    return null;
  }
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const data = encoded.replace(/[=]+$/, '');
  const padding = encoded.length - data.length;
  if (
    data.length % 4 === 1 ||
    (padding > 0 &&
      (encoded.length % 4 !== 0 || padding !== (4 - (data.length % 4)) % 4))
  ) {
    return null;
  }

  let accumulator = 0;
  let bits = 0;
  const escapedBytes: string[] = [];
  for (const character of data) {
    accumulator = accumulator * 64 + alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      const divisor = 2 ** bits;
      const byte = Math.floor(accumulator / divisor);
      accumulator %= divisor;
      escapedBytes.push('%' + byte.toString(16).padStart(2, '0'));
    }
  }
  // Nonzero unused bits are a noncanonical encoding.
  if (accumulator !== 0) {
    return null;
  }
  try {
    return decodeURIComponent(escapedBytes.join(''));
  } catch {
    return null;
  }
}
