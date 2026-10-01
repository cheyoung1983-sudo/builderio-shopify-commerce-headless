import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Socket } from 'net'

export const PRIMARY_AGENT_ID = 'agent_3101m30qaxc1f3981zq05pp86ax1'
export const FALLBACK_AGENT_ID = 'agent_6301kqxr35beedj8n91eq7gz73d7'
export const PRODUCTION_ORIGIN = 'https://www.displaycellpros.com'

let wss: WebSocketServer | null = null

export function getWsProxyServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({
      noServer: true,
      handleProtocols: (protocols: Set<string>) => {
        if (protocols.has('convai')) return 'convai'
        return Array.from(protocols)[0] || false
      },
    })

    wss.on('connection', (clientWs: WebSocket, req: IncomingMessage) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
        const requestedAgent = reqUrl.searchParams.get('agent_id') || reqUrl.searchParams.get('agentId')

        // Default to healthy fallback agent if the quota-depleted primary agent is requested
        const agentId =
          requestedAgent === PRIMARY_AGENT_ID
            ? FALLBACK_AGENT_ID
            : requestedAgent || FALLBACK_AGENT_ID

        // Build clean ElevenLabs WebSocket URL with agent_id only (ElevenLabs returns 403 if invalid query params are passed)
        const upstreamUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`

        console.log(`[WsProxy] Bridging client to ElevenLabs upstream for agent: ${agentId}`)

        const upstreamHeaders: Record<string, string> = {
          Origin: PRODUCTION_ORIGIN,
          'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0 (compatible; DisplayCellPros/1.0)',
        }

        const elevenLabsWs = new WebSocket(upstreamUrl, ['convai'], {
          headers: upstreamHeaders,
        })

        const pendingClientQueue: Array<{ data: any; isBinary: boolean }> = []

        elevenLabsWs.on('open', () => {
          console.log(`[WsProxy] ElevenLabs upstream connected successfully for agent: ${agentId}`)
          while (pendingClientQueue.length > 0) {
            const item = pendingClientQueue.shift()
            if (item && elevenLabsWs.readyState === WebSocket.OPEN) {
              elevenLabsWs.send(item.data, { binary: item.isBinary })
            }
          }
        })

        clientWs.on('message', (data: any, isBinary: boolean) => {
          if (elevenLabsWs.readyState === WebSocket.OPEN) {
            elevenLabsWs.send(data, { binary: isBinary })
          } else if (elevenLabsWs.readyState === WebSocket.CONNECTING) {
            pendingClientQueue.push({ data, isBinary })
          }
        })

        elevenLabsWs.on('message', (data: any, isBinary: boolean) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary })
          }
        })

        elevenLabsWs.on('close', (code: number, reason: Buffer) => {
          const reasonStr = reason ? reason.toString() : ''
          console.log(`[WsProxy] ElevenLabs upstream closed: code=${code}, reason=${reasonStr}`)
          if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
            clientWs.close(code, reasonStr)
          }
        })

        clientWs.on('close', (code: number, reason: Buffer) => {
          const reasonStr = reason ? reason.toString() : ''
          console.log(`[WsProxy] Client closed: code=${code}, reason=${reasonStr}`)
          if (elevenLabsWs.readyState === WebSocket.OPEN || elevenLabsWs.readyState === WebSocket.CONNECTING) {
            elevenLabsWs.close(code, reasonStr)
          }
        })

        elevenLabsWs.on('error', (err: Error) => {
          console.warn('[WsProxy] ElevenLabs upstream error:', err?.message)
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, 'Voice service upstream error')
          }
        })

        clientWs.on('error', (err: Error) => {
          console.warn('[WsProxy] Client inbound error:', err?.message)
          if (elevenLabsWs.readyState === WebSocket.OPEN) {
            elevenLabsWs.close(1011, 'Client transport error')
          }
        })
      } catch (err) {
        console.error('[WsProxy] Connection handler error:', err)
        clientWs.close(1011, 'Proxy initialization failure')
      }
    })
  }

  return wss
}

export function attachWsProxyToServer(server: any) {
  if (!server || server._wsProxyAttached) return
  server._wsProxyAttached = true

  const proxyWss = getWsProxyServer()

  // Capture existing upgrade listeners (e.g. Next.js HMR)
  const existingListeners = server.listeners('upgrade').slice()
  server.removeAllListeners('upgrade')

  server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      const pathname = request.url
        ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname
        : ''

      if (pathname === '/api/agent/ws-proxy') {
        proxyWss.handleUpgrade(request, socket, head, (ws: any) => {
          proxyWss.emit('connection', ws, request)
        })
        return
      }

      // Delegate any other upgrade requests to original listeners (e.g. HMR)
      for (const listener of existingListeners) {
        listener.call(server, request, socket, head)
      }
    } catch (err) {
      console.error('[WsProxy] Upgrade event error:', err)
      socket.destroy()
    }
  })

  console.log('[WsProxy] Intercepted upgrade listener attached to server')
}
