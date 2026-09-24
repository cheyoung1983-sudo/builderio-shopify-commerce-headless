import { NextResponse } from 'next/server';
import { elevenLabsRequest } from '../../../../services/elevenlabs';

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();
    
    // Based on docs, simple TTS call
    const response = await elevenLabsRequest(`/text-to-speech/${voiceId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    const audioBlob = await response.blob();
    return new NextResponse(audioBlob, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
