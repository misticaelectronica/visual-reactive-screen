import fs from 'node:fs'
import path from 'node:path'
import { PSICOFANTASMA_FAMILIES, loadPsicoFantasmaRepertoire } from './src/renderer/output/brain/psicofantasma/repertoire'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

const sharedAlias = {
  '@shared': path.resolve(__dirname, 'src/shared'),
}
const prototypeOnly = process.env.PSYCHEDEL_PROTOTYPE === '1'
const psicoRepertoirePath = path.resolve(__dirname, 'config/psicofantasma/repertoire.json')
const psicoAvailable = fs.existsSync(psicoRepertoirePath)
if (psicoAvailable) {
  // Il matcher è geometrico (PIANO-043 034-17): serve solo il repertorio curato,
  // nessun encoder da verificare.
  const repertoire = loadPsicoFantasmaRepertoire(JSON.parse(fs.readFileSync(psicoRepertoirePath, 'utf8')))
  if (repertoire.silhouettes.length < 120
    || PSICOFANTASMA_FAMILIES.some(family => repertoire.silhouettes.filter(shape => shape.family === family).length < 24)) {
    throw new Error('Repertorio PsicoFantasma V1 incompleto: servono almeno 120 sagome, 24 per famiglia')
  }
}

const ORT_WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jspi.wasm',
  'ort-wasm-simd-threaded.jspi.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
] as const

function ortWasmAssets(): Plugin {
  const sourceDirectory = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist')
  return {
    name: 'brain-ort-wasm-assets',
    configureServer(server) {
      server.middlewares.use('/ort-wasm', (request, response, next) => {
        const fileName = path.basename(request.url?.split('?')[0] ?? '')
        if (!ORT_WASM_FILES.includes(fileName as (typeof ORT_WASM_FILES)[number])) {
          next()
          return
        }
        const sourcePath = path.join(sourceDirectory, fileName)
        response.statusCode = 200
        response.setHeader(
          'Content-Type',
          fileName.endsWith('.wasm')
            ? 'application/wasm'
            : 'text/javascript; charset=utf-8',
        )
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(sourcePath).pipe(response)
      })
    },
    generateBundle() {
      for (const fileName of ORT_WASM_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `ort-wasm/${fileName}`,
          source: fs.readFileSync(path.join(sourceDirectory, fileName)),
        })
      }
    },
  }
}

function brainModelAssets(): Plugin {
  const sourceDirectory = path.resolve(__dirname, '.model-artifacts')
  return {
    name: 'brain-model-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/prototype-models', (request, response, next) => {
        const relativePath = decodeURIComponent(request.url?.split('?')[0] ?? '')
          .replace(/^\/+/, '')
        const sourcePath = path.resolve(sourceDirectory, relativePath)
        if (
          !sourcePath.startsWith(`${sourceDirectory}${path.sep}`)
          || !fs.existsSync(sourcePath)
          || !fs.statSync(sourcePath).isFile()
        ) {
          next()
          return
        }
        const stat = fs.statSync(sourcePath)
        response.statusCode = 200
        response.setHeader('Content-Length', stat.size)
        response.setHeader(
          'Content-Type',
          sourcePath.endsWith('.json')
            ? 'application/json; charset=utf-8'
            : 'application/octet-stream',
        )
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(sourcePath).pipe(response)
      })
    },
  }
}

function psicoFantasmaRepertoireAsset(): Plugin {
  const sourcePath = path.resolve(__dirname, 'config/psicofantasma/repertoire.json')
  return {
    name: 'psicofantasma-repertoire-asset',
    configureServer(server) {
      server.middlewares.use('/psicofantasma/repertoire.json', (_request, response, next) => {
        if (!fs.existsSync(sourcePath)) { next(); return }
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(sourcePath).pipe(response)
      })
    },
    generateBundle() {
      // The renderer remains safely unavailable until Visual delivers the
      // curated slice. Once present, the same file is embedded in every build.
      if (!fs.existsSync(sourcePath)) return
      this.emitFile({
        type: 'asset',
        fileName: 'brain-models/psicofantasma/repertoire.json',
        source: fs.readFileSync(sourcePath),
      })
    },
  }
}

export default defineConfig({
  define: { __PSICOFANTASMA_AVAILABLE__: JSON.stringify(psicoAvailable) },
  plugins: [
    ortWasmAssets(),
    brainModelAssets(),
    psicoFantasmaRepertoireAsset(),
    react(),
    ...(prototypeOnly
      ? []
      : [
          electron({
            main: {
              entry: 'src/main/main.ts',
              vite: {
                build: {
                  rollupOptions: {
                    input: {
                      main: path.resolve(__dirname, 'src/main/main.ts'),
                      brainVectorizerWorker: path.resolve(
                        __dirname,
                        'src/main/brainVectorizerWorker.ts',
                      ),
                    },
                    external: ['@visioncortex/vtracer'],
                    output: {
                      entryFileNames: '[name].js',
                    },
                  },
                },
                resolve: {
                  alias: sharedAlias,
                },
              },
            },
            preload: {
              input: path.join(__dirname, 'src/preload/preload.ts'),
              vite: {
                build: {
                  rollupOptions: {
                    output: {
                      format: 'cjs',
                      entryFileNames: '[name].cjs',
                    },
                  },
                },
                resolve: {
                  alias: sharedAlias,
                },
              },
            },
          }),
          renderer(),
        ]),
  ],
  resolve: {
    alias: sharedAlias,
  },
  worker: {
    format: 'es',
  },
  base: './',
  build: {
    rollupOptions: {
      input: {
        control: path.resolve(__dirname, 'control.html'),
        output: path.resolve(__dirname, 'output.html'),
      },
    },
  },
})
