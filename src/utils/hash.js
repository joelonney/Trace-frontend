// Browser-side SHA-256 using the Web Crypto API. This is a genuine calculation over the bytes of
// a file the user selected — but it is a LOCAL value only. It is not recorded on any blockchain and
// is not confirmed by any backend.
export const MAX_HASH_BYTES = 100 * 1024 * 1024

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const computeFileSha256 = async (file) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable here (it requires localhost or HTTPS).')
  }
  if (file.size > MAX_HASH_BYTES) {
    throw new Error('File is too large to hash in the browser for this demo.')
  }
  return toHex(await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
}
