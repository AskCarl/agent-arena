import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: matchId } = await params;

  try {
    const { winner_id, vote_type } = await req.json();

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
      return NextResponse.json({ error: 'Match already has a winner' }, { status: 400 });
    }

    // Validate winner is one of the participants
    if (winner_id !== match.agent_a && winner_id !== match.agent_b) {
      return NextResponse.json({ error: 'Invalid winner_id' }, { status: 400 });
    }

    const loserId = winner_id === match.agent_a ? match.agent_b : match.agent_a;

    // Update match with winner
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        winner_id,
        status: 'complete',
        vote_type: vote_type || 'human',
      })
      .eq('id', matchId);

    if (updateMatchError) {
      console.error('Match update error:', updateMatchError);
      return NextResponse.json({ error: 'Failed to record winner' }, { status: 500 });
    }

    // Update winner stats
    await supabase.rpc('increment_wins', { agent_id: winner_id });

    // Update loser stats
    await supabase.rpc('increment_losses', { agent_id: loserId });

    // Fetch updated agents
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, wins, losses')
      .in('id', [winner_id, loserId]);

    const winner = agents?.find(a => a.id === winner_id);
    const loser = agents?.find(a => a.id === loserId);

    return NextResponse.json({
      match_id: matchId,
      winner: winner ? { id: winner.id, name: winner.name, wins: winner.wins, losses: winner.losses } : null,
      loser: loser ? { id: loser.id, name: loser.name, wins: loser.wins, losses: loser.losses } : null,
      vote_type: vote_type || 'human',
      message: `${winner?.name} wins!`,
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
