import { useEffect, useState } from 'react'
import { getUserDirectory } from '../api/auth'

// Returns { [userId]: name } for displaying custodians/uploaders. Falls back to the raw id.
export const useUserDirectory = () => {
  const [directory, setDirectory] = useState({})
  useEffect(() => {
    let cancelled = false
    getUserDirectory()
      .then((d) => !cancelled && setDirectory(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return (id) => directory[id] ?? id
}
