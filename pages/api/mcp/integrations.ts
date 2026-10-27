import type { NextApiRequest, NextApiResponse } from 'next'
import { configureAllIntegrations, getRootMcpConfiguration, getServerMcpConfiguration } from '../../../lib/mcp-integration-manager'
import { isAdminSession } from '../../../lib/tribal/admin-auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  // Ensure caller is authorized admin or internal service
  const authorized = isAdminSession(req) || req.headers['x-internal-service'] === 'display-cell-pros-backend'
  if (!authorized && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Unauthorized request to MCP integrations status.',
    })
  }

  try {
    const report = configureAllIntegrations()
    const rootMcp = getRootMcpConfiguration()
    const serverMcp = getServerMcpConfiguration()

    return res.status(200).json({
      success: true,
      report,
      configurations: {
        rootMcp,
        serverMcp,
      },
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while evaluating MCP integrations.',
    })
  }
}
