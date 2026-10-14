cd .\.github\actions\deploy

pnpm dlx esbuild index.ts `
  --bundle `
  --format=esm `
  --platform=node `
  --outfile=dist/index.js `
  --minify `
  --tree-shaking=true `
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

cd ../../..