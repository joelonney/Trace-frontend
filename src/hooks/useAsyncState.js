import { useCallback, useEffect, useState } from 'react'

// Loads data with `load` and returns its latest settled result — without calling setState
// synchronously inside an effect (the pattern React discourages: it renders twice for no reason).
//
//   const load = useCallback(async () => ({ status: 'ready', … }), [deps])   // must be stable
//   const { state, setState, refresh } = useAsyncState(load, PENDING)
//
// - `state` is `pending` until the *current* `load` has settled, and again whenever `load`'s
//   identity changes (i.e. its dependencies changed), so stale results are never shown.
// - `load` must resolve (catch errors itself and return a status object); it should never reject.
// - `refresh()` re-runs `load` and swaps in the result without flashing back to `pending`.
// - `setState(value)` replaces the current result (e.g. after an optimistic local change).
export const useAsyncState = (load, pending) => {
  const [settled, setSettled] = useState(null) // { load, value }

  useEffect(() => {
    let cancelled = false
    load().then((value) => {
      if (!cancelled) setSettled({ load, value })
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const state = settled && settled.load === load ? settled.value : pending
  const setState = useCallback((value) => setSettled({ load, value }), [load])
  const refresh = useCallback(() => load().then(setState), [load, setState])

  return { state, setState, refresh }
}
