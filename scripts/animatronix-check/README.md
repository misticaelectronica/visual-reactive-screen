# Prova visiva ANIMATRONIX (Electron, WebGL2 reale)

Renderizza le transizioni fra raster sintetici con lo shader vero e misura lo
scarto medio fra fotogrammi consecutivi: un valore isolato molto sopra la
mediana è uno "scatto" visibile. Uso, dalla radice del repo:

    node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild scripts/animatronix-check/harness.ts --bundle --format=iife --outfile=scripts/animatronix-check/harness.js
    env -u NODE_OPTIONS -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/animatronix-check

`harness.js` è generato, non va committato.
