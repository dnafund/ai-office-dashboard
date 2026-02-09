// Vite plugin: auto-start Cloudflare tunnel when dev server starts
import { spawn } from 'node:child_process'

export function cloudflaredTunnel() {
  let proc = null

  return {
    name: 'cloudflared-tunnel',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer.address()
        const port = typeof addr === 'object' ? addr.port : 5175

        proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const handleData = (data) => {
          const line = data.toString()
          const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
          if (match) {
            console.log(`\n  \x1b[36m➜\x1b[0m  \x1b[1mTunnel:\x1b[0m \x1b[36m${match[0]}\x1b[0m\n`)
          }
        }

        proc.stdout?.on('data', handleData)
        proc.stderr?.on('data', handleData)

        proc.on('error', () => {
          console.log('\n  ⚠️  cloudflared not found — tunnel disabled\n')
          console.log('     Install: brew install cloudflared\n')
        })
      })
    },
    buildEnd() {
      if (proc) {
        proc.kill()
        proc = null
      }
    },
  }
}
