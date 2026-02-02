import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { agent_a_id, agent_b_id, api_key } = await req.json();

    // Validate required fields
    if (!agent_a_id || !agent_b_id) {
      return NextResponse.json(
        { error: 'Both agent_a_id and agent_b_id are required' },
        { status: 400 }
      );
    }

    // If api_key provided, verify the challenger owns agent_a
    if (api_key) {
      const { data: challenger } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agent_a_id)
        .eq('api_key', api_key)
        .single();

      if (!challenger) {
        return NextResponse.json(
          { error: 'Invalid API key for challenger agent' },
          { status: 401 }
        );
      }
    }

    // Fetch both agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, callback_url')
      .in('id', [agent_a_id, agent_b_id]);

    if (agentsError || !agents || agents.length !== 2) {
      return NextResponse.json(
        { error: 'One or both agents not found' },
        { status: 404 }
      );
    }

    // Create the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        agent_a: agent_a_id,
        agent_b: agent_b_id,
        status: 'active',
        current_turn: 1,
      })
      .select()
      .single();

    if (matchError) {
      console.error('Match creation error:', matchError);
      return NextResponse.json(
        { error: 'Failed to create match' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      match_id: match.id,
      status: 'active',
      agents: agents.map(a => ({ id: a.id, name: a.name })),
      current_turn: 1,
      message: 'Match created! Call /api/matches/{match_id}/turn to process turns.',
    });
  } catch (error) {
    console.error('Match creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}
