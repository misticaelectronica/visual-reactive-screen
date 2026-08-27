import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { AppSettings, PublicSessionStatus } from '@shared/types'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

const QR_PREVIEW_SIZE_PX = 180

export function PublicSessionPanel({ settings, onChange }: Props) {
  const api = window.fxControl
  const [status, setStatus] = useState<PublicSessionStatus>({
    active: false,
    startedAtIso: null,
    collectedCount: 0,
    lastError: null,
    formUrl: null,
  })
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!api) return
    return api.onPublicSessionStatus(setStatus)
  }, [api])

  useEffect(() => {
    if (!status.active || !status.formUrl) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(status.formUrl, { width: QR_PREVIEW_SIZE_PX, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [status.active, status.formUrl])

  const openSession = async () => {
    if (!api) return
    setBusy(true)
    await api.startPublicSession(settings.publicSessionCsvUrl, settings.publicSessionFormUrl)
    setBusy(false)
  }

  const closeSession = async () => {
    if (!api) return
    setBusy(true)
    await api.stopPublicSession()
    setBusy(false)
  }

  return (
    <fieldset className="panel">
      <legend>Sessione pubblica (frasi dal pubblico)</legend>

      <label className="field">
        URL Google Form (codificato nel QR)
        <input
          type="text"
          value={settings.publicSessionFormUrl}
          onChange={(e) => onChange({ publicSessionFormUrl: e.target.value })}
          placeholder="https://docs.google.com/forms/d/e/.../viewform"
        />
      </label>

      <label className="field">
        URL CSV pubblicato del foglio collegato
        <input
          type="text"
          value={settings.publicSessionCsvUrl}
          onChange={(e) => onChange({ publicSessionCsvUrl: e.target.value })}
          placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
        />
      </label>

      <div className="toolbar">
        <button
          type="button"
          onClick={() => void openSession()}
          disabled={busy || status.active || !settings.publicSessionCsvUrl || !settings.publicSessionFormUrl}
        >
          Apri sessione pubblica
        </button>
        <button
          type="button"
          onClick={() => void closeSession()}
          disabled={busy || !status.active}
        >
          Chiudi sessione
        </button>
      </div>

      {status.active ? (
        <p className="status">
          Sessione attiva — {status.collectedCount} frasi raccolte
        </p>
      ) : (
        <p className="status">Sessione non attiva</p>
      )}
      {status.lastError ? <p className="error">Errore: {status.lastError}</p> : null}

      {status.active && qrDataUrl ? (
        <img src={qrDataUrl} alt="QR sessione pubblica" width={QR_PREVIEW_SIZE_PX} height={QR_PREVIEW_SIZE_PX} />
      ) : null}
    </fieldset>
  )
}
