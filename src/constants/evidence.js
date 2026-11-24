// Evidence type list, per-type extension allow-list, size cap and the client-side validator.
// Used by both the mock and HTTP implementations and by the upload form. The backend applies the
// same rules authoritatively (API_CONTRACT_V1 §4.4 adds magic-byte sniffing on top).
export const ALLOWED_EXTENSIONS = {
  Video: ['mp4', 'mov', 'avi', 'mkv'],
  Audio: ['mp3', 'wav', 'm4a', 'aac'],
  Document: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
  'Image Archive': ['jpg', 'jpeg', 'png', 'tiff', 'zip'],
  'Disk Image': ['img', 'dd', 'e01', 'raw', 'iso'],
  'Log File': ['log', 'txt', 'json', 'evtx'],
}
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
export const EVIDENCE_TYPES = Object.keys(ALLOWED_EXTENSIONS)

export const validateEvidenceFile = (file, fileType) => {
  if (!file) return 'Select a file to register.'
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) return 'File exceeds the 100 MB demo limit.'
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
  const allowed = ALLOWED_EXTENSIONS[fileType] ?? []
  if (!allowed.includes(ext)) {
    return `".${ext || '?'}" files are not accepted for ${fileType}. Allowed: ${allowed.map((e) => `.${e}`).join(', ')}.`
  }
  return null
}
