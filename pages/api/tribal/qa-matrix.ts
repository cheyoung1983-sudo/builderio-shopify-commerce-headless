import type { NextApiRequest, NextApiResponse } from 'next'
import { evaluateQAScenario } from '../../../lib/tribal/qa-matrix'
import { QAScenarioName } from '../../../lib/tribal/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const scenarios: QAScenarioName[] = [
      'ENROLLED_ON_RESERVATION',
      'ENROLLED_OFF_RESERVATION',
      'NOT_ENROLLED_ON_RESERVATION',
      'NOT_ENROLLED_OFF_RESERVATION',
    ]

    const results = await Promise.all(scenarios.map((s) => evaluateQAScenario(s)))
    const allPassed = results.every((r) => r.actualResults.passed)

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      allPassed,
      totalScenarios: results.length,
      passedScenarios: results.filter((r) => r.actualResults.passed).length,
      scenarios: results,
    })
  } catch (err: any) {
    console.error('Error running QA matrix:', err)
    return res.status(500).json({ error: 'QA matrix evaluation failed', details: err.message })
  }
}
