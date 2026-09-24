import { NextResponse } from 'next/server';
import { elevenLabsRequest } from '../../../../services/elevenlabs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // ElevenLabs STT expects audio file
    const response = await elevenLabsRequest(`/speech-to-text`, {
      method: 'POST',
      body: formData,
      // elevenLabsRequest adds header, for form-data we shouldn't set Content-Type manually if possible
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY as string },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
