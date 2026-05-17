import { useCallback, useEffect, useState } from 'react'
import type { DisplayInfo } from '@shared/types'

export function useDisplays() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.fxControl
    if (!api) {
      setError('Bridge Electron non disponibile')
      return
    }
    try {
      const list = await api.getDisplays()
      setDisplays(list)
      setError(null)
    } catch {
      setError('Impossibile leggere i display')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const api = window.fxControl
    if (!api) return
    const off = api.onOutputClosed(() => {
      void refresh()
    })
    return off
  }, [refresh])

  return { displays, refresh, error }
}
