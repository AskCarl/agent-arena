import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice options - using expressive voices good for rap
const VOICES = {
  adam: 'pNInz6obpgDQGcFmaJgB',      // Deep American male
  arnold: 'VR6AewLTigWG4xSOukaG',    // Gruff American male  
  daniel: 'onwK4e9ZLuTAKqWW03F9',    // Authoritative British male
  callum: 'N2lVS1w4EtoT3dr4eOWO',    // Intense Transatlantic male
};

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured - missing API key' }, { status: 500 });
  }

  try {
    const { text, voice = 'adam' } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const voiceId = VOICES[voice as keyof typeof VOICES] || VOICES.adam;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.3,        // Lower = more expressive/variable
          similarity_boost: 0.8,
          style: 0.5,            // More stylized delivery
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', response.status, error);
      return NextResponse.json({ 
        error: 'TTS generation failed', 
        status: response.status,
        detail: error.slice(0, 200)
      }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
