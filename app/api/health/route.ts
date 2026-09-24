import { NextResponse } from 'next/server';

export async function GET() {
  // Mock health status checks
  return NextResponse.json({
    elevenLabs: { status: 'connected', lastChecked: new Date().toISOString() },
    webhooks: { status: 'healthy', pending: 0 },
    apiKeys: { status: 'configured', provider: 'ElevenLabs' },
    audioWorklet: { status: 'available' }
  });
}
