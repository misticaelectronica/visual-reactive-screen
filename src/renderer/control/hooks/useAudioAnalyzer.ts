import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, BandEnergies } from '@shared/types'
import { allBandBinRanges } from '@shared/frequencyBands'
import {
  computeBandEnergies,
  smoothBandEnergies,
  updateMovingAverage,
} from '@shared/audioMath'

export interface AudioFrameSnapshot {
  bandEnergies: BandEnergies
  movingAverages: BandEnergies
  meters: BandEnergies
  audioPrimed: boolean
  rawFrequencyData?: Uint8Array
}

const emptyBands = (): BandEnergies => ({
  low: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
})

function alphaFromTau(deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return 0
  return Math.exp(-deltaMs / tauMs)
}

function buildAudioConstraints(deviceId: string | null): MediaStreamConstraints {
  return {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  }
}

function shouldRetryWithDefaultDevice(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'OverconstrainedError' ||
      error.name === 'NotFoundError' ||
      error.name === 'DevicesNotFoundError')
  )
}

function audioErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Permesso microfono negato. Abilita il microfono per questa app nelle impostazioni macOS.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'Nessun ingresso audio disponibile'
    }
    if (error.name === 'OverconstrainedError') {
      return 'Ingresso audio non piu disponibile. Seleziona di nuovo il dispositivo.'
    }
  }
  return error instanceof Error ? error.message : 'Impossibile avviare audio'
}

export function useAudioAnalyzer(
  deviceId: string | null,
  fftSize: AppSettings['fftSize'],
  smoothingTimeConstant: number,
) {
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [meters, setMeters] = useState<BandEnergies>(emptyBands)
  const [averages, setAverages] = useState<BandEnergies>({
    low: 0.05,
    lowMid: 0.05,
    mid: 0.05,
    high: 0.05,
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const movingRef = useRef<BandEnergies>({
    low: 0.05,
    lowMid: 0.05,
    mid: 0.05,
    high: 0.05,
  })
  const metersRef = useRef<BandEnergies>(emptyBands())
  const lastBandsRef = useRef<BandEnergies>(emptyBands())
  const framesRef = useRef(0)

  const binRangesCache = useRef<{
    sampleRate: number
    fft: number
    ranges: ReturnType<typeof allBandBinRanges>
  } | null>(null)

  const freqBufferRef = useRef<Uint8Array | null>(null)

  const stop = useCallback(() => {
    setRunning(false)
    framesRef.current = 0
    try {
      sourceRef.current?.disconnect()
    } catch {
      /* ignore */
    }
    sourceRef.current = null
    try {
      analyserRef.current?.disconnect()
    } catch {
      /* ignore */
    }
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close().catch(() => undefined)
    ctxRef.current = null
    freqBufferRef.current = null
    binRangesCache.current = null
    movingRef.current = { low: 0.05, lowMid: 0.05, mid: 0.05, high: 0.05 }
    metersRef.current = emptyBands()
    lastBandsRef.current = emptyBands()
    setMeters(emptyBands())
  }, [])

  const start = useCallback(async () => {
    stop()
    setError(null)
    if (!deviceId) {
      setError('Seleziona un ingresso audio')
      return
    }
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints(deviceId))
      } catch (e) {
        if (!shouldRetryWithDefaultDevice(e)) throw e
        stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints(null))
      }
      streamRef.current = stream

      const ctx = new AudioContext()
      ctxRef.current = ctx
      await ctx.resume()

      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant
      analyser.minDecibels = -90
      analyser.maxDecibels = -10
      analyserRef.current = analyser

      freqBufferRef.current = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount),
      )

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source
      source.connect(analyser)

      binRangesCache.current = {
        sampleRate: ctx.sampleRate,
        fft: analyser.fftSize,
        ranges: allBandBinRanges(ctx.sampleRate, analyser.fftSize),
      }

      setRunning(true)
    } catch (e) {
      setError(audioErrorMessage(e))
      stop()
    }
  }, [deviceId, fftSize, smoothingTimeConstant, stop])

  useEffect(() => {
    const ctx = ctxRef.current
    const analyser = analyserRef.current
    if (!ctx || !analyser || !running) return

    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = smoothingTimeConstant
    freqBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    binRangesCache.current = {
      sampleRate: ctx.sampleRate,
      fft: analyser.fftSize,
      ranges: allBandBinRanges(ctx.sampleRate, analyser.fftSize),
    }
  }, [fftSize, smoothingTimeConstant, running])

  const pullFrame = useCallback(
    (deltaMs: number): AudioFrameSnapshot | null => {
      const analyser = analyserRef.current
      const freqBuf = freqBufferRef.current
      const cache = binRangesCache.current
      if (!analyser || !freqBuf || !cache) return null

      analyser.getByteFrequencyData(freqBuf as Uint8Array<ArrayBuffer>)
      const bands = computeBandEnergies(freqBuf, cache.ranges)

      lastBandsRef.current = bands

      const avgTauMs = 280
      const meterTauMs = 55
      const avgAlpha = alphaFromTau(deltaMs, avgTauMs)
      movingRef.current = updateMovingAverage(movingRef.current, bands, avgAlpha)

      const meterAlpha = alphaFromTau(deltaMs, meterTauMs)
      metersRef.current = smoothBandEnergies(metersRef.current, bands, meterAlpha)

      framesRef.current += 1
      const audioPrimed = framesRef.current > 20

      return {
        bandEnergies: bands,
        movingAverages: movingRef.current,
        meters: metersRef.current,
        audioPrimed,
        rawFrequencyData: freqBuf,
      }
    },
    [],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setMeters({ ...metersRef.current })
      setAverages({ ...movingRef.current })
    }, 50)
    return () => window.clearInterval(id)
  }, [])

  return {
    error,
    running,
    start,
    stop,
    pullFrame,
    meters,
    averages,
    sampleRate: ctxRef.current?.sampleRate || 44100,
  }
}
