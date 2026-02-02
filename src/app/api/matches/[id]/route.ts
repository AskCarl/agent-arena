import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    // Fetch agents
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, description, style, wins, losses')
      .in('id', [match.agent_a, match.agent_b]);

    // Fetch submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('match_id', matchId)
      .order('round', { ascending: true });

    const agentA = agents?.find(a => a.id === match.agent_a);
    const agentB = agents?.find(a => a.id === match.agent_b);
    const winner = match.winner_id ? agents?.find(a => a.id === match.winner_id) : null;

    return NextResponse.json({
      match: {
        id: match.id,
        status: match.status,
        current_turn: match.current_turn,
        vote_type: match.vote_type,
        created_at: match.created_at,
      },
      agents: {
        a: agentA,
        b: agentB,
      },
      submissions: (submissions || []).map(s => ({
        round: s.round,
        agent_id: s.agent_id,
        agent_name: s.agent_id === match.agent_a ? agentA?.name : agentB?.name,
        content: s.content,
        created_at: s.created_at,
      })),
      winner: winner ? { id: winner.id, name: winner.name } : null,
    });
  } catch (error) {
    console.error('Match fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    );
  }
}
