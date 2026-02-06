/**
 * Hook Server - HTTP server for receiving Claude Code hook events
 *
 * Listens on 127.0.0.1:19823 for POST /sessionly requests from
 * Claude Code hooks (curl commands piping stdin JSON).
 */

import { EventEmitter } from 'node:events'
import * as http from 'node:http'
import { HOOK_SERVER_PORT, HOOK_SERVER_PATH } from '../../shared/pet-types'
import type { HookEventPayload, HookStatus } from '../../shared/pet-types'
import { petLogger } from './pet-logger'

const MAX_BODY_SIZE = 1024 * 1024 // 1MB

export class HookServer extends EventEmitter {
  private server: http.Server | null = null
  private running = false

  /**
   * Start the hook server. Returns false if the port is already taken.
   */
  start(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.running) {
        resolve(true)
        return
      }

      const server = http.createServer(this.handleRequest.bind(this))

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          petLogger.hookServerStatus('failed', `Port ${HOOK_SERVER_PORT} already in use`)
          resolve(false)
        } else {
          petLogger.hookServerStatus('failed', err.message)
          resolve(false)
        }
      })

      server.listen(HOOK_SERVER_PORT, '127.0.0.1', () => {
        this.server = server
        this.running = true
        petLogger.hookServerStatus('started', `Listening on 127.0.0.1:${HOOK_SERVER_PORT}`)
        resolve(true)
      })
    })
  }

  /**
   * Stop the hook server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.close(() => {
        this.server = null
        this.running = false
        petLogger.hookServerStatus('stopped')
        resolve()
      })
    })
  }

  /**
   * Get current server status.
   */
  getStatus(hooksInstalled: boolean): HookStatus {
    return {
      serverRunning: this.running,
      port: HOOK_SERVER_PORT,
      hooksInstalled,
    }
  }

  isRunning(): boolean {
    return this.running
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Only accept POST to our path
    if (req.method !== 'POST' || req.url !== HOOK_SERVER_PATH) {
      res.writeHead(404)
      res.end()
      return
    }

    const chunks: Buffer[] = []
    let bodySize = 0

    req.on('data', (chunk: Buffer) => {
      bodySize += chunk.length
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413)
        res.end()
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8')
        const payload = JSON.parse(body) as HookEventPayload

        // Validate required fields
        if (!payload.session_id || !payload.hook_event_name) {
          res.writeHead(400)
          res.end('{"error":"missing session_id or hook_event_name"}')
          return
        }

        // Log and emit the event
        petLogger.hookEvent(payload)
        this.emit('hookEvent', payload)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      } catch {
        res.writeHead(400)
        res.end('{"error":"invalid JSON"}')
      }
    })

    req.on('error', () => {
      res.writeHead(500)
      res.end()
    })
  }
}
