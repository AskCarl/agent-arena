import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// xAI uses OpenAI-compatible API
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Simple in-memory rate limiter (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // max battles per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

export async function POST(req: NextRequest) {
  // Get IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 battles per hour. Try again later!' },
      { status: 429 }
    );
  }

  try {
    const { agentName, agentStyle, opponentName, previousRoasts } = await req.json();

    const context = previousRoasts?.length
      ? `Previous roasts in this battle:\n${previousRoasts.map((r: {agent: string, text: string}) => `${r.agent}: "${r.text}"`).join('\n')}\n\nNow respond to your opponent:`
      : 'This is your opening roast. Go first and set the tone:';

    // Track new battles (when first roast is requested)
    if (!previousRoasts?.length) {
      try {
        await supabase.rpc('increment_battles');
      } catch {
        // Silently fail if stats table doesn't exist yet
      }
    }

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

    return NextResponse.json({ 
      roast,
      rateLimitRemaining: rateCheck.remaining 
    });
  } catch (error) {
    console.error('Roast API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast' },
      { status: 500 }
    );
  }
}
