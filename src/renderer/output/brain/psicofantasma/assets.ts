import { loadPsicoFantasmaRepertoire, type Repertoire } from './repertoire'

let repertoirePromise: Promise<Repertoire> | null = null

export function loadBundledPsicoFantasmaRepertoire(): Promise<Repertoire> {
  if (repertoirePromise) return repertoirePromise
  const url = 'brain-model://local/psicofantasma/repertoire.json'
  repertoirePromise = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`Repertorio PsicoFantasma assente (${response.status})`)
    return loadPsicoFantasmaRepertoire(await response.json())
  })
  return repertoirePromise
}
