import type { NextApiRequest, NextApiResponse } from 'next'
import { attachWsProxyToServer } from '../../../lib/ws-proxy-server'
import {
  applyCors,
  handleOptions,
  DEFAULT_AGENT_CORS_OPTIONS,
} from '../../../lib/api-security'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const corsOptions = DEFAULT_AGENT_CORS_OPTIONS
  applyCors(res, req.headers.origin, corsOptions)

  if (handleOptions(req, res, corsOptions)) return

  // Attach the WebSocket upgrade listener to the underlying Node http.Server
  const server = (res.socket as any)?.server
  if (server) {
    attachWsProxyToServer(server)
  }

  res.status(200).json({
    status: 'ok',
    service: 'ElevenLabs WebSocket Proxy',
    proxyPath: '/api/agent/ws-proxy',
    originSpoofTarget: 'https://www.displaycellpros.com',
  })
}
