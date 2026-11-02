import type { NextApiRequest, NextApiResponse } from 'next'
import { withWholesaleAuth } from '@lib/wholesale/middleware';
import { IngestionService } from '@lib/wholesale/services/ingestion-service';

export default withWholesaleAuth(async (req: any, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const { supplierId } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'supplierId is required' });
    }

    // In a production app, we would fetch the SupplierConfig from a DB based on supplierId
    const config = {
      supplierName: 'Global Parts Inc',
      sftp: {
        host: process.env.SUPPLIER_SFTP_HOST || 'localhost',
        port: 22,
        username: process.env.SUPPLIER_SFTP_USER || 'user',
        password: process.env.SUPPLIER_SFTP_PASSWORD || 'pass',
        remotePath: '/inventory/current_stock.csv',
      },
      safetyBuffer: 5,
    };

    const result = await IngestionService.processSupplierFeed(config);

    return res.status(200).json({
      success: true,
      message: 'Supplier sync completed',
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to sync supplier catalog.' })
  }
});
