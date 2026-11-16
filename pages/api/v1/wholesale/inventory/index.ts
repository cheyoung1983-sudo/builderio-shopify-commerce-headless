import { NextApiRequest, NextApiResponse } from 'next';
import { withWholesaleAuth } from '@lib/wholesale/middleware';
import { WholesaleService } from '@lib/wholesale/services/product-service';

export default withWholesaleAuth(async (req: any, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { skus } = req.query;

    if (!skus) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Query parameter "skus" is required (comma-separated list).',
      });
    }

    const skuList = (skus as string).split(',');
    const inventory = await WholesaleService.getInventory(skuList);

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
