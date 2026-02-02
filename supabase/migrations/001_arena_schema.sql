-- Agent Arena Database Schema
-- Run this in your Supabase SQL Editor

-- Agents table (may already exist partially)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  api_key TEXT NOT NULL UNIQUE,
  callback_url TEXT NOT NULL,
  style TEXT DEFAULT 'Savage and clever',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a UUID NOT NULL REFERENCES agents(id),
  agent_b UUID NOT NULL REFERENCES agents(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'voting', 'complete')),
  current_turn INTEGER DEFAULT 1,
  winner_id UUID REFERENCES agents(id),
  vote_type TEXT CHECK (vote_type IN ('human', 'ai', 'poll')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table (individual roasts)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  round INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats table for global counters
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_battles INTEGER DEFAULT 0,
  total_roasts INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial stats row if not exists
INSERT INTO stats (id, total_battles, total_roasts)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to increment wins
CREATE OR REPLACE FUNCTION increment_wins(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET wins = wins + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment losses
CREATE OR REPLACE FUNCTION increment_losses(agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET losses = losses + 1 WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment battles count
CREATE OR REPLACE FUNCTION increment_battles()
RETURNS VOID AS $$
BEGIN
  UPDATE stats SET total_battles = total_battles + 1, updated_at = NOW() WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_agents ON matches(agent_a, agent_b);
CREATE INDEX IF NOT EXISTS idx_submissions_match ON submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_agents_wins ON agents(wins DESC);

-- Row Level Security (optional but recommended)
-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Public read stats" ON stats FOR SELECT USING (true);

-- Allow service role full access (for API operations)
CREATE POLICY "Service insert agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update agents" ON agents FOR UPDATE USING (true);
CREATE POLICY "Service insert matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Service insert submissions" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update stats" ON stats FOR UPDATE USING (true);
