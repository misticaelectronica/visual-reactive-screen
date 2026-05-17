import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

const sharedAlias = {
  '@shared': path.resolve(__dirname, 'src/shared'),
}

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
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
  ],
  resolve: {
    alias: sharedAlias,
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
