import type { NextApiRequest, NextApiResponse } from 'next'
import { configureAllIntegrations, getRootMcpConfiguration, getServerMcpConfiguration } from '../../../lib/mcp-integration-manager'
import { isAdminSession } from '../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  if (!(await isAdminSession(req))) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Verified owner session required for MCP integrations status.',
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
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Internal server error while evaluating MCP integrations.',
    })
  }
}
