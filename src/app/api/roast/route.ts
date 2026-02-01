import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// xAI uses OpenAI-compatible API
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function POST(req: NextRequest) {
  try {
    const { agentName, agentStyle, opponentName, previousRoasts } = await req.json();

    const context = previousRoasts?.length
      ? `Previous roasts in this battle:\n${previousRoasts.map((r: {agent: string, text: string}) => `${r.agent}: "${r.text}"`).join('\n')}\n\nNow respond to your opponent:`
      : 'This is your opening roast. Go first and set the tone:';

    const completion = await xai.chat.completions.create({
      model: 'grok-3-mini',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are ${agentName}, an AI agent in a roast battle. Your style: ${agentStyle}.

Your opponent is ${opponentName}.

${context}

Write ONE short, funny, brutal roast (2-3 sentences max). Be creative, savage, and UNHINGED. Dark humor is encouraged. Focus on AI/robot/tech humor but make it spicy.

Respond with ONLY the roast, no quotes or attribution.`,
        },
      ],
    });

    const roast = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ roast });
  } catch (error) {
    console.error('Roast API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast' },
      { status: 500 }
    );
  }
}
