// Fetch wrapper for VITE_API_MODE=http. Not yet exercised against a live backend — the shapes
// follow docs/API_CONTRACT_V1.md and are covered by scripts/adapters-check.mjs with a fake fetch.
import { BASE_URL, ApiError } from './client'

export const AUTH_EXPIRED_EVENT = 'trace:auth-expired'

export const createHttp = ({ baseUrl = BASE_URL, fetchImpl = globalThis.fetch, onAuthExpired } = {}) => {
  // Access token lives in memory only (never localStorage/sessionStorage).
  let accessToken = null

  const setAccessToken = (token) => {
    accessToken = token ?? null
  }
  const getAccessToken = () => accessToken

  const buildUrl = (path, query) => {
    const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
      }
    }
    return url.toString()
  }

  const parseBody = async (res) => {
    const type = res.headers?.get?.('content-type') ?? ''
    if (res.status === 204) return null
    if (type.includes('application/json')) return res.json()
    return res.text()
  }

  const toError = (res, body) => {
    const err = body && typeof body === 'object' ? body.error : null
    return new ApiError(
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.code ?? null,
      err?.details ?? null,
    )
  }

  const expire = () => {
    accessToken = null
    if (onAuthExpired) onAuthExpired()
    else if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
  }

  const doFetch = async (method, path, { query, body, formData, headers = {}, credentials = 'include' } = {}) => {
    const init = { method, headers: { Accept: 'application/json', ...headers }, credentials }
    if (accessToken) init.headers.Authorization = `Bearer ${accessToken}`
    if (formData) {
      init.body = formData // browser sets multipart boundary
    } else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    try {
      return await fetchImpl(buildUrl(path, query), init)
    } catch {
      throw new ApiError(`Backend unreachable at ${baseUrl}`, 0, 'NETWORK', null)
    }
  }

  const refresh = async () => {
    const res = await doFetch('POST', '/auth/refresh')
    if (!res.ok) return false
    const data = await parseBody(res)
    if (data?.access_token) {
      accessToken = data.access_token
      return true
    }
    return false
  }

  const request = async (method, path, opts = {}) => {
    let res = await doFetch(method, path, opts)
    const isAuthRoute = path.startsWith('/auth/')
    if (res.status === 401 && !isAuthRoute && !opts._retried) {
      const ok = await refresh()
      if (ok) {
        res = await doFetch(method, path, { ...opts, _retried: true })
      } else {
        expire()
        throw toError(res, await parseBody(res))
      }
      if (res.status === 401) expire()
    }
    const data = await parseBody(res)
    if (!res.ok) throw toError(res, data)
    return data
  }

  return {
    request,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    put: (path, body) => request('PUT', path, { body }),
    del: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, { formData }),
    setAccessToken,
    getAccessToken,
    refresh,
  }
}

export const http = createHttp()
