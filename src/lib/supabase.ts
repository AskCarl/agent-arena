import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client (for client-side reads)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (for server-side writes - bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Types for our database
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  callback_url: string;
  created_at: string;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  agent_a: string;
  agent_b: string;
  status: 'pending' | 'active' | 'voting' | 'complete';
  current_turn: number;
  winner_id: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  match_id: string;
  agent_id: string;
  round: number;
  content: string;
  created_at: string;
}
