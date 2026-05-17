import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/defaults'

export function useSettingsPersistence(
  settings: AppSettings,
  setSettings: Dispatch<SetStateAction<AppSettings>>,
) {
  const saveTimer = useRef<number | null>(null)
  const hydrated = useRef(false)

  const saveNow = useCallback(async (next: AppSettings) => {
    const api = window.fxControl
    if (!api) return
    await api.saveSettings(next)
  }, [])

  const scheduleSave = useCallback(
    (next: AppSettings) => {
      if (!hydrated.current) return
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void saveNow(next)
      }, 350)
    },
    [saveNow],
  )

  useEffect(() => {
    const api = window.fxControl
    if (!api) return
    void (async () => {
      const loaded = await api.loadSettings()
      if (loaded) {
        setSettings({ ...DEFAULT_SETTINGS, ...loaded })
      }
      hydrated.current = true
    })()
  }, [setSettings])

  useEffect(() => {
    scheduleSave(settings)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [settings, scheduleSave])

  return { saveNow }
}
