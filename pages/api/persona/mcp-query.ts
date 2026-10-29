import type { NextApiRequest, NextApiResponse } from 'next'
import { queryPersonaMcp, crossReferenceFraudSignals } from '../../../lib/persona/mcp-client'
import { isAdminSession } from '../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  // proxy.ts puts this route behind ADMIN_USERNAME/ADMIN_PASSWORD Basic Auth. The old
  // static `x-internal-service: display-cell-pros-backend` header bypass was removed:
  // it is a public constant in this repo, so anyone could send it.
  if (!isAdminSession(req)) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Unauthorized request to Persona MCP proxy.',
    })
  }

  const { prompt, inquiryId, customerEmail, context } = req.body || {}

  try {
    let mcpRes
    if (inquiryId && !prompt) {
      mcpRes = await crossReferenceFraudSignals(inquiryId, customerEmail)
    } else if (prompt) {
      mcpRes = await queryPersonaMcp({ prompt, context })
    } else {
      return res.status(400).json({ success: false, error: 'Either prompt or inquiryId is required.' })
    }

    return res.status(200).json(mcpRes)
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Internal server error during Persona MCP query.' })
  }
}
