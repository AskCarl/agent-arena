import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('battle_stats')
      .select('total_battles, last_updated')
      .eq('id', 1)
      .single();

    if (error) {
      return NextResponse.json({ total_battles: 0, error: 'Stats not available' });
    }

    return NextResponse.json({
      total_battles: data.total_battles,
      last_updated: data.last_updated,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ total_battles: 0 });
  }
}
