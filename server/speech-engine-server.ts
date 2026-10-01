import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifySpeechEngineJwt } from '../lib/compliance/jwt'

const PORT = Number(process.env.SPEECH_ENGINE_PORT) || 3001
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'speech-engine-upstream' }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const authHeader = request.headers[
    'x-elevenlabs-speech-engine-authorization'
  ] as string | undefined

  if (!authHeader || !verifySpeechEngineJwt(authHeader, ELEVENLABS_API_KEY)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

interface Session {
  conversationId?: string
  lastEventId: number
  abortController?: AbortController
}

const activeSessions = new Map<WebSocket, Session>()

wss.on('connection', (ws) => {
  const session: Session = { lastEventId: 0 }
  activeSessions.set(ws, session)

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'init') {
        session.conversationId = msg.conversation_id
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      } else if (msg.type === 'user_transcript') {
        const eventId = msg.event_id || 0

        if (session.abortController) {
          session.abortController.abort()
        }

        if (eventId <= session.lastEventId) {
          return // Ignore stale/interrupted turns
        }

        session.lastEventId = eventId
        session.abortController = new AbortController()

        // Stream response back
        ws.send(
          JSON.stringify({
            type: 'agent_response',
            content:
              'Hello! I am receiving your transcript via Speech Engine Upstream.',
            event_id: eventId,
            is_final: false,
          })
        )

        ws.send(
          JSON.stringify({
            type: 'agent_response',
            content: '',
            event_id: eventId,
            is_final: true,
          })
        )
      }
    } catch (err) {
      ws.send(
        JSON.stringify({ type: 'error', message: 'Invalid payload format' })
      )
    }
  })

  ws.on('close', () => {
    if (session.abortController) session.abortController.abort()
    activeSessions.delete(ws)
  })
})

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(
      `[SpeechEngineUpstream] WebSocket server listening on port ${PORT} at /speech-engine/upstream`
    )
  })
}

export { server, wss }
