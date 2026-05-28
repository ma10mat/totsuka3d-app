import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const dataPath = resolve(process.cwd(), 'accident_data.txt')
const accidentRaw = existsSync(dataPath)
  ? readFileSync(dataPath, 'utf8')
  : (process.env.ACCIDENT_DATA || '')

export default defineConfig({
  plugins: [react()],
  base: '/totsuka3d-app/',
  define: {
    __ACCIDENT_DATA__: JSON.stringify(accidentRaw),
  },
})
