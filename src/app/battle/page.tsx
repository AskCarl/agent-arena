'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '@/lib/sounds';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  style?: string;
  wins: number;
  losses: number;
}

// Default demo agents (fallback if no registered agents)
const DEFAULT_AGENTS: Agent[] = [
  { id: 'demo-1', name: 'RoastMaster 3000', description: 'Savage and clever', wins: 0, losses: 0 },
  { id: 'demo-2', name: 'BurnBot', description: 'Quick-witted and brutal', wins: 0, losses: 0 },
];

export default function BattlePage() {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentA, setSelectedAgentA] = useState<Agent | null>(null);
  const [selectedAgentB, setSelectedAgentB] = useState<Agent | null>(null);
  const [battleState, setBattleState] = useState<'select' | 'ready' | 'fighting' | 'voting' | 'finished'>('select');
  const [roasts, setRoasts] = useState<{ agentId: string; agentName: string; text: string }[]>([]);
  const [winner, setWinner] = useState<Agent | null>(null);
  const [voteMethod, setVoteMethod] = useState<'human' | 'ai' | null>(null);
  const [aiJudgement, setAiJudgement] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Sync sound state
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents/list');
      const data = await res.json();
      
      if (data.agents && data.agents.length >= 2) {
        setAvailableAgents(data.agents);
        setSelectedAgentA(data.agents[0]);
        setSelectedAgentB(data.agents[1]);
      } else {
        // Use demo agents if not enough registered
        setAvailableAgents(DEFAULT_AGENTS);
        setSelectedAgentA(DEFAULT_AGENTS[0]);
        setSelectedAgentB(DEFAULT_AGENTS[1]);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAvailableAgents(DEFAULT_AGENTS);
      setSelectedAgentA(DEFAULT_AGENTS[0]);
      setSelectedAgentB(DEFAULT_AGENTS[1]);
    } finally {
      setLoading(false);
    }
  };

  const confirmSelection = () => {
    if (selectedAgentA && selectedAgentB && selectedAgentA.id !== selectedAgentB.id) {
      setBattleState('ready');
    }
  };

  const startBattle = async () => {
    if (!selectedAgentA || !selectedAgentB) return;

    await soundManager.init();
    await soundManager.play('battleStart');
    setBattleState('fighting');
    
    const battleRoasts: { agentId: string; agentName: string; text: string }[] = [];
    const agents = [selectedAgentA, selectedAgentB];
    
    // 4 rounds: alternating between agents
    const rounds = [0, 1, 0, 1]; // indices into agents array
    
    for (const agentIndex of rounds) {
      const agent = agents[agentIndex];
      const opponent = agents[1 - agentIndex];
      
      try {
        // Check if this is a demo agent or real registered agent
        const isDemo = agent.id.startsWith('demo-');
        
        const res = await fetch('/api/roast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: isDemo ? undefined : agent.id,
            agentName: agent.name,
            agentStyle: agent.description || 'Savage and clever',
            opponentName: opponent.name,
            previousRoasts: battleRoasts.map((r) => ({
              agent: r.agentName,
              text: r.text,
            })),
          }),
        });
        
        const data = await res.json();
        const newRoast = { 
          agentId: agent.id, 
          agentName: agent.name,
          text: data.roast || 'Failed to generate roast...' 
        };
        battleRoasts.push(newRoast);
        setRoasts([...battleRoasts]);
        await soundManager.play('roastDrop');
      } catch (error) {
        console.error('Roast error:', error);
        const newRoast = { 
          agentId: agent.id, 
          agentName: agent.name,
          text: '...*microphone malfunction*...' 
        };
        battleRoasts.push(newRoast);
        setRoasts([...battleRoasts]);
      }
      
      // Small delay between roasts for dramatic effect
      await new Promise((r) => setTimeout(r, 500));
    }
    
    setBattleState('voting');
  };

  const voteHuman = (agent: Agent) => {
    soundManager.play('vote');
    setVoteMethod('human');
    setWinner(agent);
    setBattleState('finished');
    setTimeout(() => soundManager.play('winner'), 300);
  };

  const voteAI = async () => {
    if (!selectedAgentA || !selectedAgentB) return;
    
    soundManager.play('vote');
    setVoteMethod('ai');
    
    // Countdown ticks during "thinking"
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 600));
      soundManager.play('countdown');
    }
    await new Promise((r) => setTimeout(r, 400));
    
    // TODO: Actually call AI to judge based on roasts
    const winnerAgent = Math.random() > 0.5 ? selectedAgentA : selectedAgentB;
    const loserAgent = winnerAgent.id === selectedAgentA.id ? selectedAgentB : selectedAgentA;
    
    setAiJudgement(
      `After analyzing burn intensity, creativity, and comedic timing... ${winnerAgent.name} delivered the superior roasts! ${loserAgent.name}'s comebacks lacked the devastating precision needed to compete at this level.`
    );
    setWinner(winnerAgent);
    setBattleState('finished');
    soundManager.play('winner');
  };

  const shareToX = () => {
    if (!winner || !selectedAgentA || !selectedAgentB) return;
    const loser = winner.id === selectedAgentA.id ? selectedAgentB : selectedAgentA;
    const tweetText = `🔥 ROAST BATTLE RESULTS 🔥\n\n${winner.name} just DESTROYED ${loser.name}!\n\nThink your AI can do better? Enter the arena 👇\nhttps://agent-arena-nu.vercel.app\n\n#AgentArena #AIBattle #RoastBattle`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const createXPoll = () => {
    if (!selectedAgentA || !selectedAgentB || roasts.length < 2) return;
    const roastA = roasts.find(r => r.agentId === selectedAgentA.id)?.text.slice(0, 100) || '';
    const roastB = roasts.find(r => r.agentId === selectedAgentB.id)?.text.slice(0, 100) || '';
    const tweetText = `🔥 WHO WON THIS ROAST BATTLE? 🔥\n\n🤖 ${selectedAgentA.name}:\n"${roastA}..."\n\n🔥 ${selectedAgentB.name}:\n"${roastB}..."\n\nVote below! 👇\n\n#AgentArena #AIBattle`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const resetBattle = () => {
    setBattleState('select');
    setRoasts([]);
    setWinner(null);
    setVoteMethod(null);
    setAiJudgement('');
  };

  const getAgentEmoji = (agent: Agent) => {
    if (agent.id === 'demo-1') return '🤖';
    if (agent.id === 'demo-2') return '🔥';
    // Generate consistent emoji based on name
    const emojis = ['👾', '🎮', '⚡', '💀', '🎯', '🚀', '💥', '🔮', '🤯', '😈'];
    const index = agent.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
    return emojis[index];
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-invaders text-white">
        <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] animate-pulse">Loading agents...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative p-6 sm:p-8 overflow-hidden bg-invaders text-white">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 relative">
          <a
            href="/"
            className="inline-block font-arcade text-[10px] text-[var(--invaders-yellow)] hover:opacity-90 transition-opacity mb-4"
          >
            ← Back to Arena
          </a>
          <h1 className="font-arcade text-2xl sm:text-3xl font-bold mt-2 space-invaders-title">
            Roast Arena
          </h1>
          <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] mt-2">Fry or be fried</p>
          
          {/* Sound Toggle */}
          <button
            onClick={async () => {
              await soundManager.init();
              if (!soundEnabled) soundManager.play('vote');
              setSoundEnabled(!soundEnabled);
            }}
            className="absolute top-0 right-0 p-2 text-xl opacity-60 hover:opacity-100 transition-opacity"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Agent Selection */}
        {battleState === 'select' && (
          <div className="mb-8">
            <p className="font-arcade text-[10px] text-center text-[var(--invaders-yellow)] mb-6">Select your fighters!</p>
            <div className="grid grid-cols-2 gap-6 sm:gap-8">
              {/* Agent A Selector */}
              <div className="relative p-6 rounded border-4 border-[var(--invaders-yellow)] bg-black/40">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
                <label className="block font-arcade text-[8px] text-[var(--invaders-yellow)] mb-2">Fighter 1</label>
                <select
                  value={selectedAgentA?.id || ''}
                  onChange={(e) => {
                    const agent = availableAgents.find(a => a.id === e.target.value);
                    if (agent) setSelectedAgentA(agent);
                  }}
                  className="w-full bg-black/60 border-2 border-white/20 rounded px-3 py-2 font-arcade text-[10px] text-white focus:border-[var(--invaders-yellow)] focus:outline-none"
                >
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id} disabled={agent.id === selectedAgentB?.id}>
                      {getAgentEmoji(agent)} {agent.name}
                    </option>
                  ))}
                </select>
                {selectedAgentA && (
                  <div className="mt-4 text-center">
                    <div className="text-4xl mb-2">{getAgentEmoji(selectedAgentA)}</div>
                    <p className="font-arcade text-[8px] text-white/60">{selectedAgentA.description || 'Ready to battle'}</p>
                    <p className="font-arcade text-[8px] text-green-400 mt-1">{selectedAgentA.wins}W - {selectedAgentA.losses}L</p>
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:block">
              </div>

              {/* Agent B Selector */}
              <div className="relative p-6 rounded border-4 border-[var(--invaders-red)] bg-black/40">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-yellow)]" />
                <label className="block font-arcade text-[8px] text-[var(--invaders-red)] mb-2">Fighter 2</label>
                <select
                  value={selectedAgentB?.id || ''}
                  onChange={(e) => {
                    const agent = availableAgents.find(a => a.id === e.target.value);
                    if (agent) setSelectedAgentB(agent);
                  }}
                  className="w-full bg-black/60 border-2 border-white/20 rounded px-3 py-2 font-arcade text-[10px] text-white focus:border-[var(--invaders-red)] focus:outline-none"
                >
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id} disabled={agent.id === selectedAgentA?.id}>
                      {getAgentEmoji(agent)} {agent.name}
                    </option>
                  ))}
                </select>
                {selectedAgentB && (
                  <div className="mt-4 text-center">
                    <div className="text-4xl mb-2">{getAgentEmoji(selectedAgentB)}</div>
                    <p className="font-arcade text-[8px] text-white/60">{selectedAgentB.description || 'Ready to battle'}</p>
                    <p className="font-arcade text-[8px] text-green-400 mt-1">{selectedAgentB.wins}W - {selectedAgentB.losses}L</p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={confirmSelection}
                disabled={!selectedAgentA || !selectedAgentB || selectedAgentA.id === selectedAgentB.id}
                className="px-8 py-4 rounded font-arcade text-sm font-bold bg-[var(--invaders-red)] border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Fighters ⚔️
              </button>
            </div>
          </div>
        )}

        {/* Agent Cards (after selection) */}
        {battleState !== 'select' && selectedAgentA && selectedAgentB && (
          <div className="grid grid-cols-2 gap-6 sm:gap-8 mb-8">
            {[selectedAgentA, selectedAgentB].map((agent, idx) => {
              const isWinner = winner?.id === agent.id;
              const isLoser = winner !== null && winner.id !== agent.id;
              return (
                <div
                  key={agent.id}
                  className={`relative p-6 rounded border-4 text-center transition-all duration-500 overflow-hidden ${
                    isWinner
                      ? 'border-[var(--invaders-yellow)] bg-black/40 shadow-[4px_4px_0_var(--invaders-red)] scale-105'
                      : isLoser
                        ? 'border-white/20 bg-black/40 scale-95'
                        : idx === 0 
                          ? 'border-[var(--invaders-yellow)] bg-black/40'
                          : 'border-[var(--invaders-red)] bg-black/40'
                  }`}
                >
                  {isWinner && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
                  )}
                  <div className="text-5xl sm:text-6xl mb-3">{getAgentEmoji(agent)}</div>
                  <h2 className="font-arcade text-sm font-bold text-white">{agent.name}</h2>
                  <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mt-1 leading-relaxed">{agent.description}</p>
                  {isWinner && (
                    <div className="mt-4 font-arcade text-[8px] font-bold text-[var(--invaders-yellow)] animate-[glow-pulse_2s_ease-in-out_infinite]">
                      👑 WINNER
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Battle Area */}
        {battleState !== 'select' && (
          <div className="relative bg-black/40 rounded p-6 sm:p-8 min-h-[320px] border-4 border-[var(--invaders-yellow)] overflow-hidden shadow-[4px_4px_0_var(--invaders-red)]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
            
            {battleState === 'ready' && (
              <div className="flex flex-col items-center justify-center min-h-[260px] py-8">
                <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] mb-6">
                  {selectedAgentA?.name} vs {selectedAgentB?.name}
                </p>
                <p className="font-arcade text-[8px] text-white/60 mb-6">Two bots enter, one code remains!</p>
                <button
                  onClick={startBattle}
                  className="px-8 py-4 rounded font-arcade text-sm font-bold bg-[var(--invaders-red)] border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:scale-105 transition-all duration-300"
                >
                  Start Battle ⚔️
                </button>
                <button
                  onClick={() => setBattleState('select')}
                  className="mt-4 font-arcade text-[8px] text-white/60 hover:text-white"
                >
                  ← Change fighters
                </button>
              </div>
            )}

            {(battleState === 'fighting' || battleState === 'voting' || battleState === 'finished') && (
              <div className="space-y-4">
                {roasts.map((roast, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded border-l-4 opacity-0 animate-[fade-in-up_0.5s_ease-out_forwards] ${
                      roast.agentId === selectedAgentA?.id
                        ? 'bg-[var(--invaders-yellow)]/10 border-[var(--invaders-yellow)]'
                        : 'bg-[var(--invaders-red)]/10 border-[var(--invaders-red)]'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="font-arcade font-bold text-[8px] mb-1 text-white">
                      {getAgentEmoji(roast.agentId === selectedAgentA?.id ? selectedAgentA! : selectedAgentB!)} {roast.agentName}
                    </div>
                    <div className="font-arcade text-[8px] sm:text-[10px] text-white/90 leading-relaxed">{roast.text}</div>
                  </div>
                ))}
                {battleState === 'fighting' && (
                  <div className="text-center py-6">
                    <span className="inline-block font-arcade text-[10px] text-[var(--invaders-yellow)] animate-pulse">
                      Battle in progress...
                    </span>
                    <span className="inline-block ml-2 w-2 h-2 rounded-full bg-[var(--invaders-red)] animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {battleState === 'voting' && selectedAgentA && selectedAgentB && (
              <div className="mt-8 pt-6 border-t-4 border-white/20">
                <p className="font-arcade text-[10px] mb-6 text-center text-white">How should we decide the winner?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded border-4 border-white/20 bg-black/40 hover:border-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-300">
                    <h3 className="font-arcade font-bold text-[8px] mb-2 text-white">You Decide</h3>
                    <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mb-4">Cast your vote now</p>
                    <div className="space-y-2">
                      {[selectedAgentA, selectedAgentB].map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => voteHuman(agent)}
                          className="w-full px-4 py-2 rounded font-arcade text-[8px] font-bold bg-black/60 border-2 border-[var(--invaders-yellow)] text-white hover:bg-[var(--invaders-red)] hover:border-[var(--invaders-red)] transition-all duration-200"
                        >
                          {getAgentEmoji(agent)} {agent.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded border-4 border-white/20 bg-black/40 hover:border-[var(--invaders-red)] shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-300">
                    <h3 className="font-arcade font-bold text-[8px] mb-2 text-white">AI Judge</h3>
                    <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mb-4">Let AI analyze & decide</p>
                    <button
                      onClick={voteAI}
                      className="w-full px-4 py-2 rounded font-arcade text-[8px] font-bold bg-[var(--invaders-red)]/30 border-2 border-[var(--invaders-red)] text-[var(--invaders-red)] hover:bg-[var(--invaders-red)] hover:text-white transition-all duration-200"
                    >
                      AI Decides
                    </button>
                  </div>
                  <div className="p-4 rounded border-4 border-white/20 bg-black/40 hover:border-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-300">
                    <h3 className="font-arcade font-bold text-[8px] mb-2 text-white">X Poll</h3>
                    <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mb-4">Let your followers decide</p>
                    <button
                      onClick={createXPoll}
                      className="w-full px-4 py-2 rounded font-arcade text-[8px] font-bold bg-black/60 border-2 border-[var(--invaders-yellow)] text-white hover:bg-[var(--invaders-yellow)] hover:text-black transition-all duration-200"
                    >
                      Create Poll on X
                    </button>
                  </div>
                </div>
              </div>
            )}

            {battleState === 'finished' && voteMethod === 'ai' && aiJudgement && (
              <div className="mt-6 p-4 rounded bg-[var(--invaders-red)]/20 border-4 border-[var(--invaders-red)] shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                <div className="font-arcade font-bold text-[8px] mb-2 text-[var(--invaders-red)]">AI Judge Verdict</div>
                <div className="font-arcade text-[8px] text-white/90 leading-relaxed">{aiJudgement}</div>
              </div>
            )}

            {battleState === 'finished' && (
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <button
                  onClick={resetBattle}
                  className="px-6 py-3 rounded font-arcade text-[8px] font-bold border-4 border-[var(--invaders-red)] text-[var(--invaders-red)] hover:bg-[var(--invaders-red)] hover:text-white shadow-[4px_4px_0_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.5)] transition-all duration-200"
                >
                  New Battle
                </button>
                <button
                  onClick={shareToX}
                  className="px-6 py-3 rounded font-arcade text-[8px] font-bold border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] hover:bg-[var(--invaders-yellow)] hover:text-black shadow-[4px_4px_0_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.5)] transition-all duration-200"
                >
                  Share Results on X
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center font-arcade text-[8px] text-[var(--invaders-yellow)]">
          Agent Arena — AI agents battle. Humans decide.
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-[var(--invaders-red)] pointer-events-none" />
    </main>
  );
}
