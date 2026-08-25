import { describe, expect, it } from 'vitest'
import type { BrainAiTask } from '@shared/brain/brainTypes'
import {
  BrainTranslator,
  isLikelyEnglishInput,
  normalizeEnglishStoryEnvelope,
} from './brainTranslator'

describe('traduttori AI Brain', () => {
  it('recupera una storia reale anche quando il modello usa sezioni non richieste', () => {
    const malformed = [
      '**TITLE:** The Rainbow Bridge',
      '**BRIDGE:** **COLORS**: RED, ORANGE, YELLOW, GREEN, BRIGHTER',
      '**FOREMOST EVENT:** A group of friends discover a mysterious bridge in their community park. Initially, they marvel at it, then share their journey with others.',
      '**FRONT OF THE MIRROR, DIALOGUE:** "I have never seen anything like this before."',
      '**PROGRESSIVE INTERACTION:** They explore its corners, compare reflections and understand that each image belongs to a different memory.',
      '**CONFIDENCE BUILDING:** As the memories intertwine, they form an alliance without giving up their separate identities.',
      '**CONCLUSION:** The bridge remains in the park and sends one reflection toward an unknown visitor.',
    ].join('\n\n')

    const recovered = normalizeEnglishStoryEnvelope(malformed)

    expect(recovered).toContain('TITLE: The Rainbow Bridge')
    expect(recovered).toContain('STORY: A group of friends discover')
    expect(recovered).toContain(
      'BRIDGE: The bridge remains in the park and sends one reflection toward an unknown visitor.',
    )
    expect(recovered).toContain(
      'COLORS: #c2413b, #dd7b32, #e3c94f, #3e8f68, #111827',
    )
  })

  it('non scambia una lista di bridge numerati per una storia', () => {
    const bridgesOnly = [
      'BRIDGE 1: The first fragment changes the rhythm.',
      'BRIDGE 2: A second fragment follows the body.',
      'BRIDGE 3: Another fragment opens the door.',
      'BRIDGE 4: The final fragment becomes collective.',
      'BRIDGE 5: A last fragment remains in the room.',
    ].join('\n')

    expect(normalizeEnglishStoryEnvelope(bridgesOnly)).toBeNull()
  })

  it('recupera la storia da sezioni narrative libere senza una seconda inferenza', () => {
    const freeForm = [
      '**INTRODUCTION**',
      'The world is divided into zones, each represented by a unique light. The people move inside their zones and form a shifting mosaic. **COLORS:** HEXADECIMALS OF COLORED LIGHTS.',
      '',
      '**PLOT DEVELOPMENT**',
      'Mara approaches the lights and sees a woman performing oral sex behind the glass. Curiosity leads her closer while the changing rhythm reveals a hidden conflict. She crosses the boundary and the mosaic reorganizes around her body. At dawn she leaves one red light active for the next visitor. **COLORS:** ABSTRACT COLOR NOTES.',
    ].join('\n')

    const recovered = normalizeEnglishStoryEnvelope(freeForm)

    expect(recovered).toContain(
      'STORY: The world is divided into zones',
    )
    expect(recovered).toContain(
      'BRIDGE: At dawn she leaves one red light active for the next visitor.',
    )
    expect(recovered).toContain(
      'a woman performing oral sex behind the glass',
    )
    expect(recovered).not.toContain('PLOT DEVELOPMENT')
    expect(recovered).not.toContain('HEXADECIMALS')
  })

  it('traduce separatamente ogni input italiano in inglese', async () => {
    const calls: Array<{ task: BrainAiTask; prompt: string }> = []
    const translator = new BrainTranslator({
      async generate(task, prompt) {
        calls.push({ task, prompt })
        return prompt.includes('donna')
          ? 'A woman follows a signal through the forest.'
          : 'The machine preserves an alien memory.'
      },
    })

    await expect(
      translator.inputsToEnglish([
        'Una donna segue un segnale nel bosco.',
        'La macchina conserva una memoria aliena.',
      ]),
    ).resolves.toEqual([
      'A woman follows a signal through the forest.',
      'The machine preserves an alien memory.',
    ])
    expect(calls[0].task).toBe('translate-input')
    expect(calls.map((call) => call.prompt)).toEqual([
      'Una donna segue un segnale nel bosco.',
      'La macchina conserva una memoria aliena.',
    ])
  })

  it('riconosce le frasi iniziali già inglesi e non chiama il traduttore', async () => {
    const calls: Array<{ task: BrainAiTask; prompt: string }> = []
    const translator = new BrainTranslator({
      async generate(task, prompt) {
        calls.push({ task, prompt })
        return 'NON DEVE ESSERE USATO'
      },
    })
    const englishPhrases = [
      'A woman follows the signal through the forest.',
      'The machine preserves an alien memory while the observers remain silent.',
      'They discover a new language between their moving bodies.',
    ]

    await expect(
      translator.inputsToEnglish(englishPhrases),
    ).resolves.toEqual(englishPhrases)
    expect(calls).toEqual([])
  })

  it('in un batch misto traduce soltanto le frasi italiane', async () => {
    const calls: string[] = []
    const translator = new BrainTranslator({
      async generate(_task, prompt) {
        calls.push(prompt)
        return 'A woman follows a signal through the forest.'
      },
    })

    await expect(
      translator.inputsToEnglish([
        'The machine opens while two figures observe the moving surface.',
        'Una donna segue un segnale nel bosco.',
      ]),
    ).resolves.toEqual([
      'The machine opens while two figures observe the moving surface.',
      'A woman follows a signal through the forest.',
    ])
    expect(calls).toEqual(['Una donna segue un segnale nel bosco.'])
  })

  it('non confonde una frase italiana con una frase inglese', () => {
    expect(isLikelyEnglishInput(
      'Il piacere diventa un’esperienza condivisa mentre le figure si avvicinano.',
    )).toBe(false)
    expect(isLikelyEnglishInput(
      'The pleasure becomes a shared experience while the figures move closer.',
    )).toBe(true)
  })

  it('produce per la UI una storia italiana senza alterare i colori', async () => {
    const translator = new BrainTranslator({
      async generate(task, prompt) {
        expect(task).toBe('translate-ui')
        return prompt === 'The Forest Memory'
          ? 'La memoria del bosco'
          : prompt === 'A silver seed waits beneath the next threshold.'
            ? 'Un seme d’argento attende sotto la soglia successiva.'
          : 'Elisa attraversa la fabbrica silenziosa e trova una creatura che custodisce il ricordo di un bosco. Insieme liberano le radici dalle macchine e restituiscono la memoria alla città.'
      },
    })

    const result = await translator.storyForUi(
      'TITLE: The Forest Memory\nSTORY: Elisa enters the silent factory and finds a creature that protects the memory of a forest. Together they free the roots from the machines and return the memory to the city.\nBRIDGE: A silver seed waits beneath the next threshold.\nCOLORS: #102030, #405060, #708090, #a0b0c0, #d0e0f0',
    )

    expect(result).toContain('TITOLO: La memoria del bosco')
    expect(result).toContain('LEGAME: Un seme d’argento')
    expect(result).toContain('#102030')
  })

  it('può saltare del tutto la traduzione UI senza occupare il worker', async () => {
    let calls = 0
    const translator = new BrainTranslator(
      {
        async generate() {
          calls += 1
          return 'non dovrebbe essere chiamato'
        },
      },
      { translateUi: false },
    )

    const result = await translator.storyForUi(
      'TITLE: The Forest Memory\nSTORY: Elisa enters the silent factory and finds a creature that protects the memory of a forest. Together they free the roots from the machines and return the memory to the city.\nBRIDGE: A silver seed waits beneath the next threshold.\nCOLORS: #102030, #405060, #708090, #a0b0c0, #d0e0f0',
    )

    expect(calls).toBe(0)
    expect(result).toContain('TITOLO: The Forest Memory')
    expect(result).toContain('STORIA: Elisa enters the silent factory')
    expect(result).toContain('#102030')
  })
})
