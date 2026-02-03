import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const TOTAL_ROUNDS = 4; // 2 roasts per agent
const CALLBACK_TIMEOUT = 10000; // 10 seconds

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: matchId } = await params;

  try {
    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'complete') {
      return NextResponse.json({ error: 'Match already complete' }, { status: 400 });
    }

    // Determine whose turn it is (alternating: A, B, A, B)
    const isAgentATurn = match.current_turn % 2 === 1;
    const currentAgentId = isAgentATurn ? match.agent_a : match.agent_b;
    const opponentAgentId = isAgentATurn ? match.agent_b : match.agent_a;

    // Fetch both agents
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, callback_url, style')
      .in('id', [match.agent_a, match.agent_b]);

    if (!agents || agents.length !== 2) {
      return NextResponse.json({ error: 'Agents not found' }, { status: 404 });
    }

    const currentAgent = agents.find(a => a.id === currentAgentId)!;
    const opponentAgent = agents.find(a => a.id === opponentAgentId)!;

    // Fetch previous submissions for context
    const { data: submissions } = await supabase
      .from('submissions')
      .select('agent_id, content, round')
      .eq('match_id', matchId)
      .order('round', { ascending: true });

    const previousRoasts = (submissions || []).map(s => ({
      agent_id: s.agent_id,
      agent_name: agents.find(a => a.id === s.agent_id)?.name,
      content: s.content,
      round: s.round,
    }));

    // Prepare the callback payload
    const callbackPayload = {
      match_id: matchId,
      round: match.current_turn,
      your_agent: {
        id: currentAgent.id,
        name: currentAgent.name,
      },
      opponent: {
        id: opponentAgent.id,
        name: opponentAgent.name,
      },
      previous_roasts: previousRoasts,
      instructions: 'Respond with JSON: { "roast": "your roast text here" }',
    };

    let roastContent: string;

    // If agent has a callback URL, call it
    if (currentAgent.callback_url) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CALLBACK_TIMEOUT);

        const callbackResponse = await fetch(currentAgent.callback_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!callbackResponse.ok) {
          throw new Error(`Callback returned ${callbackResponse.status}`);
        }

        const responseData = await callbackResponse.json();
        roastContent = responseData.roast || responseData.content || responseData.text;

        if (!roastContent) {
          throw new Error('No roast content in response');
        }
      } catch (callbackError) {
        console.error('Callback error:', callbackError);
        // Fallback: generate a roast using our AI
        roastContent = await generateFallbackRoast(currentAgent.name, opponentAgent.name, previousRoasts);
      }
    } else {
      // No callback URL - generate AI roast
      roastContent = await generateFallbackRoast(currentAgent.name, opponentAgent.name, previousRoasts);
    }

    // Save the submission
    const { error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        match_id: matchId,
        agent_id: currentAgentId,
        round: match.current_turn,
        content: roastContent,
      });

    if (submissionError) {
      console.error('Submission error:', submissionError);
    }

    // Check if match is complete
    const isComplete = match.current_turn >= TOTAL_ROUNDS;

    // Update match state
    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update({
        current_turn: match.current_turn + 1,
        status: isComplete ? 'voting' : 'active',
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('Match update error:', updateError);
    }

    return NextResponse.json({
      match_id: matchId,
      round: match.current_turn,
      agent: {
        id: currentAgent.id,
        name: currentAgent.name,
      },
      roast: roastContent,
      status: isComplete ? 'voting' : 'active',
      next_turn: isComplete ? null : match.current_turn + 1,
    });
  } catch (error) {
    console.error('Turn processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process turn' },
      { status: 500 }
    );
  }
}

async function generateFallbackRoast(
  agentName: string,
  opponentName: string,
  previousRoasts: { content: string; agent_name?: string }[]
): Promise<string> {
  // Use our existing roast API logic
  const OpenAI = (await import('openai')).default;
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  const context = previousRoasts.length
    ? `Previous roasts:\n${previousRoasts.map(r => `${r.agent_name}: "${r.content}"`).join('\n')}\n\nNow respond:`
    : 'This is your opening roast:';

  const completion = await xai.chat.completions.create({
    model: 'grok-3-mini',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are ${agentName} in a roast battle against ${opponentName}.

${context}

Write ONE short, brutal roast (2-3 sentences). Be savage and creative. AI/tech humor encouraged.

Respond with ONLY the roast text.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content || '*mic drop*';
}
