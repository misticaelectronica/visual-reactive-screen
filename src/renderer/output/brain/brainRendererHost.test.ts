import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { BRAIN_CONFIG } from '@shared/brain/brainConfig'
import type { BrainRendererId } from '@shared/types'
import type { BrainRendererPluginContext } from './brainRendererPlugin'
import { BrainRendererRegistry } from './brainRendererPlugin'
import { createBrainRendererHost } from './brainRendererHost'

describe('Brain renderer host', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  function registerSafetyNetFixtures(registry: BrainRendererRegistry): { setVectorMorphFailed(value: boolean): void } {
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
      create(context) {
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update() {},
          destroy() { element.remove() },
        }
      },
    })
    registry.register({
      id: 'filter-psiche',
      label: 'FilterPsiche',
      capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
      create(context) {
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update() {},
          destroy() { element.remove() },
        }
      },
    })
    let vectorMorphFailed = false
    registry.register({
      id: 'vector-morph',
      label: 'Vector Morph',
      capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
      create(context) {
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          hasFailed: () => vectorMorphFailed,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update() {},
          destroy() { element.remove() },
        }
      },
    })
    return { setVectorMorphFailed: (value) => { vectorMorphFailed = value } }
  }

  it('passa a FilterPsiche come rete di sicurezza se il renderer attivo fallisce fuori dalla Riattivazione (es. Vector Morph respinto dal controllo qualità)', () => {
    const registry = new BrainRendererRegistry()
    const fixtures = registerSafetyNetFixtures(registry)
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'vector-morph',
      'vector-morph',
    )
    host.setTransition(1, 'enter')
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    expect(host.element.dataset.activeRenderer).toBe('vector-morph')

    fixtures.setVectorMorphFailed(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_000)
    // Non aspetta la fine del fotogramma: chiede subito FilterPsiche come
    // renderer entrante (crossfade normale, non un taglio secco). Print2D
    // è escluso di proposito: gira solo durante la Riattivazione
    // (PIANO-034) — usarlo qui incondizionatamente era la regressione
    // segnalata dal Capo Supremo.
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 4_500)
    expect(host.element.dataset.activeRenderer).toBe('filter-psiche')
    host.destroy()
  })

  it('passa a Print2D come rete di sicurezza se il renderer attivo fallisce DURANTE la Riattivazione', () => {
    const registry = new BrainRendererRegistry()
    const fixtures = registerSafetyNetFixtures(registry)
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'vector-morph',
      'vector-morph',
      () => true,
    )
    host.setTransition(1, 'enter')
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    expect(host.element.dataset.activeRenderer).toBe('vector-morph')

    fixtures.setVectorMorphFailed(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_000)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 4_500)
    expect(host.element.dataset.activeRenderer).toBe('print2d')
    host.destroy()
  })

  it('PIANO-040 §4/§6.1/§17.1: durante la Riattivazione in regime basso, il regime vince — la rete di sicurezza resta FilterPsiche, non Print2D', () => {
    const registry = new BrainRendererRegistry()
    const fixtures = registerSafetyNetFixtures(registry)
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'vector-morph',
      'vector-morph',
      () => true, // boosted (Riattivazione)
      undefined,
      () => 'respiro-profondo', // regime basso: Print2D non eleggibile, il regime vince
    )
    host.setTransition(1, 'enter')
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    expect(host.element.dataset.activeRenderer).toBe('vector-morph')

    fixtures.setVectorMorphFailed(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_000)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 4_500)
    expect(host.element.dataset.activeRenderer).toBe('filter-psiche')
    host.destroy()
  })

  it('notifica onRendererFailed quando il renderer attivo fallisce, cosí il selettore può saltare avanti', () => {
    // Segnalato dal Capo Supremo: senza questa notifica la rete di
    // sicurezza (Print2D durante la Riattivazione) restava in scena per
    // l'intera durata residua del fotogramma invece di lasciare che il
    // selettore avanzasse subito al prossimo renderer.
    const registry = new BrainRendererRegistry()
    const fixtures = registerSafetyNetFixtures(registry)
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const failures: BrainRendererId[] = []
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'vector-morph',
      'vector-morph',
      () => true,
      (id) => failures.push(id),
    )
    host.setTransition(1, 'enter')
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    fixtures.setVectorMorphFailed(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_000)
    expect(failures).toEqual(['vector-morph'])
    host.destroy()
  })

  it('mantiene il renderer corrente finché quello entrante è pronto', () => {
    const registry = new BrainRendererRegistry()
    const destroyed: BrainRendererId[] = []
    let psychoReady = false
    for (const id of ['print2d', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: {
          multipleImages: id === 'psycho2d',
          semanticMetadata: id === 'psycho2d',
          lowPowerMode: true,
        },
        create(context) {
          const element = document.createElement('div')
          element.dataset.fakeRenderer = id
          context.container.appendChild(element)
          return {
            element,
            isReady: () => id === 'print2d' || psychoReady,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() {
              destroyed.push(id)
              element.remove()
            },
          }
        },
      })
    }

    let requested: BrainRendererId = 'print2d'
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({
          frameId: 'frame',
          description: 'frame',
          svg: '<svg/>',
        }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => requested,
      'print2d',
    )
    host.setTransition(1, 'enter')
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      1_000,
    )
    requested = 'psycho2d'
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      2_000,
    )
    expect(destroyed).toEqual([])

    psychoReady = true
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      3_000,
    )
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      4_800,
    )
    expect(destroyed).toContain('print2d')
    expect(container.querySelector('[data-fake-renderer="psycho2d"]')).not.toBeNull()
    host.destroy()
    expect(destroyed).toContain('psycho2d')
  })

  it('propaga il flash globale ai renderer attivo ed entrante', () => {
    const registry = new BrainRendererRegistry()
    const receivedFlash = new Map<BrainRendererId, number[]>()
    for (const id of ['print2d', 'psycho2d'] as const) {
      receivedFlash.set(id, [])
      registry.register({
        id,
        label: id,
        capabilities: {
          multipleImages: id === 'psycho2d',
          semanticMetadata: id === 'psycho2d',
          lowPowerMode: true,
        },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update(_bands, _settings, _time, _rhythm, _movingAverages, flash) {
              receivedFlash.get(id)?.push(flash?.intensity ?? 0)
            },
            destroy() {
              element.remove()
            },
          }
        },
      })
    }

    let requested: BrainRendererId = 'print2d'
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => requested,
      'print2d',
    )
    host.setTransition(1, 'enter')
    requested = 'psycho2d'
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      1_000,
      undefined,
      undefined,
      { active: true, intensity: 0.68 },
    )

    expect(receivedFlash.get('print2d')).toEqual([0.68])
    expect(receivedFlash.get('psycho2d')).toEqual([0.68])
    host.destroy()
  })

  it('usa FilterPsiche solo sotto pressione risorse reale, non per la sola generazione in corso', () => {
    const registry = new BrainRendererRegistry()
    const updates: number[] = []
    const pressureCalls: boolean[][] = []
    const makePlugin = (id: 'print2d' | 'filter-psiche' | 'psycho2d') => ({
      id,
      label: id,
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context: BrainRendererPluginContext) {
        const instance = updates.length
        updates.push(0)
        pressureCalls.push([])
        const element = document.createElement('div')
        element.dataset.print2dInstance = String(instance)
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure(active: boolean) {
            pressureCalls[instance].push(active)
          },
          setTransition() {},
          update() {
            updates[instance] += 1
          },
          destroy() {
            element.remove()
          },
        }
      },
    })
    registry.register(makePlugin('print2d'))
    registry.register(makePlugin('filter-psiche'))
    registry.register(makePlugin('psycho2d'))
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )

    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    // Senza pressione risorse reale, il layer di passthrough non deve
    // nemmeno essere creato: nessun costo pagato per qualcosa che non serve.
    expect(updates).toEqual([1])
    expect(container.querySelector('[data-brain-denoising-filter-psiche="true"]')).toBeNull()

    // La sola generazione in corso (offlineHold) non deve più coprire il
    // renderer pieno: il passthrough resta idle (e non viene creato) e il
    // renderer reale continua ad aggiornare normalmente.
    host.setOfflineHold?.(true)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 2_000)
    expect(updates).toEqual([2])
    expect(host.element.dataset.brainOfflineHold).toBe('active')
    expect(host.element.dataset.brainDenoisingFilterPsiche ?? 'idle').toBe('idle')

    host.setResourcePressure(true)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 3_000)
    // La prima vera pressione crea finalmente i layer di passthrough: sia
    // FilterPsiche sia Psycho2D (il "mix" richiesto durante il denoising).
    expect(host.element.dataset.brainDenoisingFilterPsiche).toBe('entering')
    expect(host.isResourcePressureReady?.()).toBe(false)
    expect(container.querySelector('[data-brain-denoising-filter-psiche="true"]')).not.toBeNull()
    expect(container.querySelector('[data-brain-denoising-psycho2d="true"]')).not.toBeNull()
    expect(updates).toHaveLength(3)
    expect(pressureCalls[1]).toContain(true)
    expect(pressureCalls[2]).toContain(true)

    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 10_000)
    host.update({ low: 1, lowMid: 1, mid: 1, high: 1 }, DEFAULT_SETTINGS, 10_100)
    expect(host.element.dataset.brainDenoisingFilterPsiche).toBe('active')
    expect(host.isResourcePressureReady?.()).toBe(true)
    // Anche in stato "active" il renderer reale sotto il passthrough continua
    // ad aggiornare (al ritmo ridotto), non resta congelato.
    expect(updates[0]).toBeGreaterThan(2)

    host.setResourcePressure(false)
    expect(host.isResourcePressureReady?.()).toBe(false)
    host.setOfflineHold?.(false)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 11_000)
    expect(host.element.dataset.brainOfflineHold).toBe('idle')
    expect(host.element.dataset.brainDenoisingFilterPsiche).toBe('exiting')
    host.destroy()
  })

  it('tiene il flash di copertura al picco finché il passthrough non è davvero pronto (preparazione lenta)', () => {
    const registry = new BrainRendererRegistry()
    let filterPsicheReady = false
    for (const id of ['print2d', 'filter-psiche', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => id === 'filter-psiche' ? filterPsicheReady : true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() { element.remove() },
          }
        },
      })
    }
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )

    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    host.setResourcePressure(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_010)
    const flashOpacity = () => Number(
      container.querySelector<HTMLDivElement>('[data-brain-pressure-flash="true"]')?.style.opacity ?? '0',
    )

    // Ben oltre la normale finestra attacco+decadimento (200ms): senza la
    // tenuta al picco il flash sarebbe già spento qui, scoprendo il
    // fotogramma bloccato del renderer attivo (segnalato dal Capo Supremo).
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_500)
    expect(flashOpacity()).toBeGreaterThan(0.4)

    // Il passthrough diventa pronto: il flash può finalmente spegnersi.
    filterPsicheReady = true
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 2_600)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 3_000)
    expect(flashOpacity()).toBe(0)
    host.destroy()
  })

  it('brief braccio destro punto 3: nel RESPIRO PROFONDO il flash va a zero, resta solo un glitch minimo', () => {
    const registry = new BrainRendererRegistry()
    for (const id of ['print2d', 'filter-psiche', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() { element.remove() },
          }
        },
      })
    }
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const buildHost = (getBioRegime?: () => 'respiro-profondo') => createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
      undefined,
      undefined,
      getBioRegime,
    )
    const flashOpacity = (root: HTMLElement | SVGSVGElement) => Number(
      root.querySelector<HTMLDivElement>('[data-brain-pressure-flash="true"]')?.style.opacity ?? '0',
    )

    // Fuori dal respiro: comportamento invariato, il flash raggiunge il picco.
    const normalHost = buildHost()
    normalHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    normalHost.setResourcePressure(true)
    normalHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_010)
    normalHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_030)
    expect(flashOpacity(normalHost.element)).toBeGreaterThan(0)
    normalHost.destroy()

    // Nel respiro stabile: stesso stallo tecnico, ma il flash resta a zero
    // per l'intera finestra attacco+decadimento — non un ritardo, un vero
    // azzeramento (la richiesta esplicita del braccio destro).
    const breathHost = buildHost(() => 'respiro-profondo')
    breathHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    breathHost.setResourcePressure(true)
    breathHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_010)
    breathHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_030)
    expect(flashOpacity(breathHost.element)).toBe(0)
    breathHost.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_100)
    expect(flashOpacity(breathHost.element)).toBe(0)
    breathHost.destroy()
  })

  it('sovrappone Psycho2D a FilterPsiche in "lighten" e a opacità ridotta durante il passthrough', () => {
    const registry = new BrainRendererRegistry()
    for (const id of ['print2d', 'filter-psiche', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: {
          multipleImages: false,
          semanticMetadata: false,
          lowPowerMode: true,
        },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() {
              element.remove()
            },
          }
        },
      })
    }
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    let regime: 'pressurized' | 'respiro-profondo' = 'pressurized'
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
      undefined,
      undefined,
      () => regime,
    )
    host.setResourcePressure(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      1_000 + BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
    )
    const filterPsicheLayer = container.querySelector(
      '[data-brain-denoising-filter-psiche="true"]',
    ) as HTMLElement | null
    const psycho2dLayer = container.querySelector(
      '[data-brain-denoising-psycho2d="true"]',
    ) as HTMLElement | null
    expect(filterPsicheLayer).not.toBeNull()
    expect(psycho2dLayer).not.toBeNull()
    expect(psycho2dLayer?.style.mixBlendMode).toBe('lighten')
    const filterPsicheOpacity = Number(filterPsicheLayer?.style.opacity)
    const psycho2dOpacity = Number(psycho2dLayer?.style.opacity)
    expect(filterPsicheOpacity).toBeGreaterThan(0)
    expect(psycho2dOpacity).toBeGreaterThan(0)
    expect(psycho2dOpacity).toBeLessThan(filterPsicheOpacity)

    // Anche un layer già creato nel regime precedente deve sparire appena
    // il regime basso diventa autoritativo: l'evento tecnico non lo bypassa.
    regime = 'respiro-profondo'
    host.update(
      { low: 0, lowMid: 0, mid: 0, high: 0 },
      DEFAULT_SETTINGS,
      2_000 + BRAIN_CONFIG.denoisingPassthroughCrossfadeMs,
    )
    expect(psycho2dLayer?.style.opacity).toBe('0')
    expect(Number(filterPsicheLayer?.style.opacity)).toBeGreaterThan(0)
    host.destroy()
  })

  it('maschera con un breve flash il fronte di salita della pressione risorse reale', () => {
    const registry = new BrainRendererRegistry()
    for (const id of ['print2d', 'filter-psiche', 'psycho2d'] as const) {
      registry.register({
        id,
        label: id,
        capabilities: { multipleImages: false, semanticMetadata: false, lowPowerMode: true },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setTransition() {},
            update() {},
            destroy() {
              element.remove()
            },
          }
        },
      })
    }
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )
    const bands = { low: 0, lowMid: 0, mid: 0, high: 0 }
    host.update(bands, DEFAULT_SETTINGS, 1_000)
    // Prima della pressione, nessun overlay creato: nessun costo pagato
    // per qualcosa che quasi sempre non serve.
    expect(container.querySelector('div[style*="mix-blend-mode: screen"]')).toBeNull()

    host.setResourcePressure(true)
    host.update(bands, DEFAULT_SETTINGS, 1_000)
    const overlay = container.querySelector(
      'div[style*="mix-blend-mode: screen"]',
    ) as HTMLElement | null
    expect(overlay).not.toBeNull()

    host.update(bands, DEFAULT_SETTINGS, 1_020)
    const risingOpacity = Number(overlay?.style.opacity)
    expect(risingOpacity).toBeGreaterThan(0)

    host.update(bands, DEFAULT_SETTINGS, 1_040)
    const peakOpacity = Number(overlay?.style.opacity)
    expect(peakOpacity).toBeGreaterThanOrEqual(risingOpacity)

    host.update(bands, DEFAULT_SETTINGS, 1_500)
    expect(overlay?.style.opacity).toBe('0')
    host.destroy()
  })

  it('inoltra audio e flash alla visuale leggera senza aggiornare continuamente il renderer pieno', () => {
    const registry = new BrainRendererRegistry()
    const received: Array<Array<{ low: number; flash: number }>> = []
    registry.register({
      id: 'print2d',
      label: 'Print2D',
      capabilities: {
        multipleImages: false,
        semanticMetadata: false,
        lowPowerMode: true,
      },
      create(context) {
        const instance = received.length
        received.push([])
        const element = document.createElement('div')
        context.container.appendChild(element)
        return {
          element,
          isReady: () => true,
          setOpacity() {},
          getMorphShapes: () => [],
          setMorphPattern() {},
          setResourcePressure() {},
          setTransition() {},
          update(bands, _settings, _time, _rhythm, _movingAverages, flash) {
            received[instance].push({
              low: bands.low,
              flash: flash?.intensity ?? 0,
            })
          },
          destroy() {
            element.remove()
          },
        }
      },
    })
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'print2d',
      'print2d',
    )
    host.setResourcePressure(true)
    host.update(
      { low: 0.72, lowMid: 0.3, mid: 0.2, high: 0.1 },
      DEFAULT_SETTINGS,
      2_000,
      undefined,
      undefined,
      { active: true, intensity: 0.64 },
    )
    host.update(
      { low: 0.38, lowMid: 0.2, mid: 0.1, high: 0.05 },
      DEFAULT_SETTINGS,
      10_000,
      undefined,
      undefined,
      { active: false, intensity: 0.12 },
    )
    host.update(
      { low: 0.24, lowMid: 0.1, mid: 0.05, high: 0.02 },
      DEFAULT_SETTINGS,
      10_100,
    )

    expect(received[1]).toEqual([
      { low: 0.72, flash: 0.64 },
      { low: 0.38, flash: 0.12 },
      { low: 0.24, flash: 0 },
    ])
    expect(received[0]).toHaveLength(2)
    host.destroy()
  })

  it('inoltra la DECOMPRESSIONE al renderer attivo e al FilterPsiche creato dal Varco', () => {
    const registry = new BrainRendererRegistry()
    const received = new Map<BrainRendererId, string[]>()
    for (const id of ['dream-segmentation', 'filter-psiche'] as const) {
      received.set(id, [])
      registry.register({
        id,
        label: id,
        capabilities: { multipleImages: true, semanticMetadata: false, lowPowerMode: true },
        create(context) {
          const element = document.createElement('div')
          context.container.appendChild(element)
          return {
            element,
            isReady: () => true,
            setOpacity() {},
            getMorphShapes: () => [],
            setMorphPattern() {},
            setResourcePressure() {},
            setPerception(state) { received.get(id)?.push(state.regime) },
            setTransition() {},
            update() {},
            destroy() { element.remove() },
          }
        },
      })
    }
    const container = document.createElement('div')
    const raster = new Blob(['raster'])
    const host = createBrainRendererHost(
      container,
      registry,
      {
        scene: { frameId: 'frame', description: 'frame', svg: '<svg/>', raster },
        raster,
        palette: ['#000000', '#333333', '#666666', '#aaaaaa', '#ffffff'],
        printMode: 'living-ink',
        getImageSources: () => [],
        getVectorScene: async () => ({ frameId: 'frame', description: 'frame', svg: '<svg/>' }),
        frameEnergy: 0.5,
        frameIndex: 0,
        frameCount: 4,
      },
      () => 'dream-segmentation',
      'dream-segmentation',
      undefined,
      undefined,
      () => 'decompression',
    )
    host.setPerception?.({
      regime: 'decompression',
      signals: {
        persistence: 0.8,
        change: 0.1,
        residual: 0.9,
        perceptualPressure: 0.4,
        pressureTrend: 'falling',
      },
    })
    expect(received.get('dream-segmentation')).toEqual(['decompression'])

    host.setResourcePressure(true)
    host.update({ low: 0, lowMid: 0, mid: 0, high: 0 }, DEFAULT_SETTINGS, 1_000)
    expect(received.get('filter-psiche')).toEqual(['decompression'])
    host.destroy()
  })
})
