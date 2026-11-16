import { NextApiRequest, NextApiResponse } from 'next';
import { validateWholesaleApiKey } from '@lib/wholesale/auth';

/**
 * Higher-order function to protect wholesale API routes.
 * Validates the X-API-Key header and attaches partner context to the request.
 */
export function withWholesaleAuth(handler: (req: any, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const apiKey = req.headers['x-api-key'] as string;

    try {
      const keyRecord = await validateWholesaleApiKey(apiKey);

      // Attach partner record to request for downstream use
      (req as any).partner = keyRecord;

      await handler(req, res);
    } catch (error: any) {
      console.error('[Wholesale Auth Error]:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message || 'Invalid or missing API key',
      });
    }
  };
}
