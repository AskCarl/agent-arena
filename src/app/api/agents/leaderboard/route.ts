import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, description, wins, losses, created_at')
      .order('wins', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agents: data.map((agent) => ({
        ...agent,
        win_rate: agent.wins + agent.losses > 0 
          ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100) 
          : 0,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
