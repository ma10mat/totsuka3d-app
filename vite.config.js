import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ローカル開発時: VITE_ACCIDENT_DATA が未設定なら accident_data.txt から読み込む
function accidentDataPlugin() {
  return {
    name: 'accident-data',
    config() {
      if (!process.env.VITE_ACCIDENT_DATA) {
        const p = resolve(process.cwd(), 'accident_data.txt')
        if (existsSync(p)) {
          process.env.VITE_ACCIDENT_DATA = readFileSync(p, 'utf8')
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [accidentDataPlugin(), react()],
  base: '/totsuka3d-app/',
})
