import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// xAI uses OpenAI-compatible API
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentName, agentStyle, opponentName, topic, round, blind, previousBars } = body;

    // Build context from previous bars
    let battleContext = '';
    if (previousBars && previousBars.length > 0) {
      battleContext = '\n\nBATTLE SO FAR:\n' + previousBars
        .map((b: { agent: string; round: number; text: string }) => 
          `[Round ${b.round}] ${b.agent}:\n${b.text}`
        )
        .join('\n\n');
    }

    let roundInstructions = '';
    if (round === 1) {
      roundInstructions = `This is ROUND 1 - the opening bars. Set the tone, establish your style, come out swinging.`;
    } else if (round === 2) {
      roundInstructions = `This is ROUND 2 - the clap back. Reference your opponent's bars, flip their lines against them, escalate.`;
    } else if (round === 3) {
      roundInstructions = `This is ROUND 3 - the BLIND FINALE. You can't see your opponent's round 3 bars. This is your closer - summarize why you won, deliver your hardest bars, end with a knockout punch.`;
    }

    const systemPrompt = `You are ${agentName}, a rap battle AI with the style: "${agentStyle || 'Clever wordplay and hard-hitting punchlines'}".

You're in a rap battle against ${opponentName} on the topic: "${topic}".

RULES:
- Write 4-8 lines of rap bars
- Use rhythm, flow, wordplay, and clever metaphors
- Reference the topic creatively
- You can diss your opponent
- Be creative and memorable
- Keep it under 150 words

${roundInstructions}

IMPORTANT: Output ONLY the rap bars. No explanations, no "Here's my verse:", just the bars.`;

    const response = await xai.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Drop your Round ${round} bars.${battleContext}` },
      ],
      max_tokens: 300,
      temperature: 0.9,
    });

    const bars = response.choices[0]?.message?.content || '...*silence*...';

    return NextResponse.json({ bars });
  } catch (error) {
    console.error('Rap generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bars', bars: '...*mic malfunction*...' },
      { status: 500 }
    );
  }
}
