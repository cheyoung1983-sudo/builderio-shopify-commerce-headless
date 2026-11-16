import { NextApiRequest, NextApiResponse } from 'next';
import { withWholesaleAuth } from '@lib/wholesale/middleware';
import { WholesaleService } from '@lib/wholesale/services/product-service';

export default withWholesaleAuth(async (req: any, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { limit = 50, updated_since } = req.query;
    const tier = req.partner.pricingTier || 'STANDARD';

    const products = await WholesaleService.getProducts(tier, updated_since as string);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total: products.length,
        limit: parseInt(limit as string),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
