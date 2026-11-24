export const formatDateTime = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const formatDate = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export const truncateHash = (hash, visible = 8) => {
  if (!hash) return '—'
  if (hash.length <= visible * 2) return hash
  return `${hash.slice(0, visible)}…${hash.slice(-visible)}`
}

export const titleCase = (value) =>
  value
    ?.toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') ?? ''
