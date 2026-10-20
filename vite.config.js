import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAPS_FILE = () => path.join(__dirname, 'public', 'data', 'maps.json')

// 地图数据静态文件持久化：dev / preview 均提供 GET/POST /api/maps
// 以 public/data/maps.json 为权威数据源，不受域名/端口变化影响
function mapsDataPlugin() {
  const handle = (req, res, next) => {
    if (req.method === 'GET') {
      if (fs.existsSync(MAPS_FILE())) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(fs.readFileSync(MAPS_FILE(), 'utf8'))
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'maps.json not found' }))
      }
      return
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => {
        try {
          fs.mkdirSync(path.dirname(MAPS_FILE()), { recursive: true })
          const tmp = MAPS_FILE() + '.tmp'
          fs.writeFileSync(tmp, body)
          fs.renameSync(tmp, MAPS_FILE())
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
      return
    }
    next()
  }
  return {
    name: 'work-maps-data-store',
    configureServer(server) {
      server.middlewares.use('/api/maps', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/maps', handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mapsDataPlugin()],
  server: {
    host: '0.0.0.0',
    open: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  },
})
