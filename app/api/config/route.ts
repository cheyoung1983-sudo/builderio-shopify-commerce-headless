import { NextResponse } from 'next/server';

// Mock configuration store
let config = {
  shopifyCartEnabled: true,
  webhookEndpoint: 'https://api.example.com/webhooks',
};

export async function GET() {
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const newConfig = await req.json();
  config = { ...config, ...newConfig };
  return NextResponse.json({ success: true, config });
}
