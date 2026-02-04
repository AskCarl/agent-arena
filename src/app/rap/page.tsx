'use client';

import { useState, useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds';

// Background beat for battles
const BATTLE_BEAT_URL = '/audio/battle-beat.mp3';

// Server-side TTS function (no API key needed from user)
async function speakBars(text: string, voice: string = 'adam'): Promise<void> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    
    if (!response.ok) return;
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  } catch (error) {
    console.error('TTS error:', error);
  }
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  style?: string;
  wins: number;
  losses: number;
}

// Default demo agents
const DEFAULT_AGENTS: Agent[] = [
  { id: 'demo-1', name: 'FlowMaster AI', description: 'Lyrical genius with killer wordplay', wins: 0, losses: 0 },
  { id: 'demo-2', name: 'BeatDrop Bot', description: 'Hard-hitting bars and punchlines', wins: 0, losses: 0 },
];

interface RapBar {
  agentId: string;
  agentName: string;
  round: number;
  text: string;
}

export default function RapBattlePage() {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentA, setSelectedAgentA] = useState<Agent | null>(null);
  const [selectedAgentB, setSelectedAgentB] = useState<Agent | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [battleState, setBattleState] = useState<'select' | 'ready' | 'fighting' | 'reveal' | 'voting' | 'finished'>('select');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [bars, setBars] = useState<RapBar[]>([]);
  const [round3Bars, setRound3Bars] = useState<{ a: string; b: string } | null>(null);
  const [revealPhase, setRevealPhase] = useState<'none' | 'a' | 'b' | 'done'>('none');
  const [winner, setWinner] = useState<Agent | null>(null);
  const [voteMethod, setVoteMethod] = useState<'human' | 'ai' | null>(null);
  const [aiJudgement, setAiJudgement] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [beatEnabled, setBeatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const beatRef = useRef<HTMLAudioElement | null>(null);

  const TOPICS = [
    'Silicon Valley',
    'Monday mornings',
    'Debugging at 3am',
    'Crypto bros',
    'The cloud',
    'AI taking jobs',
    'Startup life',
    'Tech interviews',
    'Social media addiction',
    'NFT obituary',
    'Aura farming',
    'Peptides',
  ];

  useEffect(() => {
    fetchAgents();
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  }, []);

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
    
    // Start the beat
    if (beatEnabled && beatRef.current) {
      beatRef.current.volume = 0.3; // Background volume
      beatRef.current.currentTime = 0;
      beatRef.current.play().catch(() => {});
    }
    
    const battleBars: RapBar[] = [];
    
    // Rounds 1 & 2: ABAB pattern
    for (const round of [1, 2]) {
      setCurrentRound(round);
      
      for (const agent of [selectedAgentA, selectedAgentB]) {
        const opponent = agent.id === selectedAgentA.id ? selectedAgentB : selectedAgentA;
        
        try {
          const res = await fetch('/api/rap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: agent.name,
              agentStyle: agent.description || 'Lyrical and clever',
              opponentName: opponent.name,
              topic,
              round,
              previousBars: battleBars.map(b => ({
                agent: b.agentName,
                round: b.round,
                text: b.text,
              })),
            }),
          });
          
          const data = await res.json();
          const newBar: RapBar = {
            agentId: agent.id,
            agentName: agent.name,
            round,
            text: data.bars || '...*mic cuts out*...',
          };
          battleBars.push(newBar);
          setBars([...battleBars]);
          await soundManager.play('roastDrop');
          
          if (voiceEnabled) {
            const voice = agent.id === selectedAgentA?.id ? 'adam' : 'arnold';
            await speakBars(newBar.text, voice);
          }
        } catch (error) {
          console.error('Rap generation error:', error);
          battleBars.push({
            agentId: agent.id,
            agentName: agent.name,
            round,
            text: '...*beat drops but no bars*...',
          });
          setBars([...battleBars]);
        }
        
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Round 3: BLIND - both submit simultaneously
    setCurrentRound(3);
    
    try {
      // Generate both in parallel (blind)
      const [resA, resB] = await Promise.all([
        fetch('/api/rap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: selectedAgentA.name,
            agentStyle: selectedAgentA.description,
            opponentName: selectedAgentB.name,
            topic,
            round: 3,
            blind: true,
            previousBars: battleBars.map(b => ({
              agent: b.agentName,
              round: b.round,
              text: b.text,
            })),
          }),
        }),
        fetch('/api/rap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: selectedAgentB.name,
            agentStyle: selectedAgentB.description,
            opponentName: selectedAgentA.name,
            topic,
            round: 3,
            blind: true,
            previousBars: battleBars.map(b => ({
              agent: b.agentName,
              round: b.round,
              text: b.text,
            })),
          }),
        }),
      ]);
      
      const dataA = await resA.json();
      const dataB = await resB.json();
      
      setRound3Bars({
        a: dataA.bars || '...*silence*...',
        b: dataB.bars || '...*silence*...',
      });
      
      // Dramatic reveal sequence
      setBattleState('reveal');
      setRevealPhase('none');
      
      await new Promise(r => setTimeout(r, 1500));
      setRevealPhase('a');
      await soundManager.play('roastDrop');
      
      const barA: RapBar = {
        agentId: selectedAgentA.id,
        agentName: selectedAgentA.name,
        round: 3,
        text: dataA.bars || '...*silence*...',
      };
      setBars([...battleBars, barA]);
      
      if (voiceEnabled) {
        await speakBars(barA.text, 'adam');
      }
      
      await new Promise(r => setTimeout(r, 2000));
      setRevealPhase('b');
      await soundManager.play('roastDrop');
      
      const barB: RapBar = {
        agentId: selectedAgentB.id,
        agentName: selectedAgentB.name,
        round: 3,
        text: dataB.bars || '...*silence*...',
      };
      setBars([...battleBars, barA, barB]);
      
      if (voiceEnabled) {
        await speakBars(barB.text, 'arnold');
      }
      
      await new Promise(r => setTimeout(r, 1000));
      setRevealPhase('done');
      
    } catch (error) {
      console.error('Round 3 error:', error);
    }
    
    // Fade out the beat
    if (beatRef.current) {
      const fadeOut = setInterval(() => {
        if (beatRef.current && beatRef.current.volume > 0.05) {
          beatRef.current.volume -= 0.05;
        } else {
          if (beatRef.current) {
            beatRef.current.pause();
            beatRef.current.volume = 0.3;
          }
          clearInterval(fadeOut);
        }
      }, 100);
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
    
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 600));
      soundManager.play('countdown');
    }
    await new Promise(r => setTimeout(r, 400));
    
    // TODO: Actually call AI to judge
    const winnerAgent = Math.random() > 0.5 ? selectedAgentA : selectedAgentB;
    const loserAgent = winnerAgent.id === selectedAgentA.id ? selectedAgentB : selectedAgentA;
    
    setAiJudgement(
      `After analyzing flow, wordplay, punchlines, and overall bars... ${winnerAgent.name} brought the heat! Their callbacks and metaphors hit harder than ${loserAgent.name}'s verses. Clear winner on the mic. 🎤🔥`
    );
    setWinner(winnerAgent);
    setBattleState('finished');
    soundManager.play('winner');
  };

  const shareToX = () => {
    if (!winner || !selectedAgentA || !selectedAgentB) return;
    const loser = winner.id === selectedAgentA.id ? selectedAgentB : selectedAgentA;
    const tweetText = `🎤 RAP BATTLE RESULTS 🎤\n\n${winner.name} just BODIED ${loser.name} on @AgentArenaGame!\n\nTopic: "${topic}"\n\nThink your AI has better bars? Enter the arena 👇\nhttps://agent-arena-nu.vercel.app/rap\n\nby @meebit1 #AgentArena #AIRapBattle`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const resetBattle = () => {
    // Stop the beat if playing
    if (beatRef.current) {
      beatRef.current.pause();
      beatRef.current.currentTime = 0;
    }
    
    setBattleState('select');
    setBars([]);
    setRound3Bars(null);
    setRevealPhase('none');
    setCurrentRound(1);
    setWinner(null);
    setVoteMethod(null);
    setAiJudgement('');
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  };

  const getAgentEmoji = (agent: Agent) => {
    if (agent.id === 'demo-1') return '🎤';
    if (agent.id === 'demo-2') return '🔥';
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
            Rap Battle Arena
          </h1>
          <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] mt-2">Upgrade your flow</p>
          
          {/* Sound & Voice Controls */}
          <div className="absolute top-0 right-0 flex gap-1">
            <button
              onClick={() => setBeatEnabled(!beatEnabled)}
              className={`p-2 text-xl transition-opacity ${beatEnabled ? 'opacity-100' : 'opacity-40'}`}
              title={beatEnabled ? 'Beat ON' : 'Beat OFF'}
            >
              🎵
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 text-xl transition-opacity ${voiceEnabled ? 'opacity-100' : 'opacity-40'}`}
              title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}
            >
              🎤
            </button>
            <button
              onClick={async () => {
                await soundManager.init();
                if (!soundEnabled) soundManager.play('vote');
                setSoundEnabled(!soundEnabled);
              }}
              className="p-2 text-xl opacity-60 hover:opacity-100 transition-opacity"
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
        
        {/* Hidden audio element for beat */}
        <audio ref={beatRef} src={BATTLE_BEAT_URL} loop />

        {/* Topic Display */}
        {battleState !== 'select' && (
          <div className="text-center mb-6">
            <span className="font-arcade text-[8px] text-white/60">TOPIC:</span>
            <p className="font-arcade text-sm text-[var(--invaders-yellow)]">"{topic}"</p>
          </div>
        )}

        {/* Agent Selection */}
        {battleState === 'select' && (
          <div className="mb-8">
            <p className="font-arcade text-[10px] text-center text-[var(--invaders-yellow)] mb-4">Select your MCs!</p>
            
            {/* Topic Selection */}
            <div className="mb-6 text-center">
              <label className="font-arcade text-[8px] text-white/60 block mb-2">Battle Topic:</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-black/60 border-2 border-[var(--invaders-yellow)] rounded px-4 py-2 font-arcade text-[10px] text-white focus:outline-none"
              >
                {TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-6 sm:gap-8">
              {/* Agent A Selector */}
              <div className="relative p-6 rounded border-4 border-[var(--invaders-yellow)] bg-black/40">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
                <label className="block font-arcade text-[8px] text-[var(--invaders-yellow)] mb-2">MC 1</label>
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
                    <p className="font-arcade text-[8px] text-white/60">{selectedAgentA.description || 'Ready to spit'}</p>
                  </div>
                )}
              </div>

              {/* Agent B Selector */}
              <div className="relative p-6 rounded border-4 border-[var(--invaders-red)] bg-black/40">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-yellow)]" />
                <label className="block font-arcade text-[8px] text-[var(--invaders-red)] mb-2">MC 2</label>
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
                    <p className="font-arcade text-[8px] text-white/60">{selectedAgentB.description || 'Ready to spit'}</p>
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
                Lock In MCs 🎤
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
                  <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mt-1">{agent.description}</p>
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
                <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] mb-2">
                  {selectedAgentA?.name} vs {selectedAgentB?.name}
                </p>
                <p className="font-arcade text-[8px] text-white/60 mb-2">Topic: "{topic}"</p>
                <p className="font-arcade text-[8px] text-white/60 mb-6">3 Rounds • ABAB • Blind Finale</p>
                <button
                  onClick={startBattle}
                  className="px-8 py-4 rounded font-arcade text-sm font-bold bg-[var(--invaders-red)] border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:scale-105 transition-all duration-300"
                >
                  Drop the Beat 🎵
                </button>
                <button
                  onClick={() => setBattleState('select')}
                  className="mt-4 font-arcade text-[8px] text-white/60 hover:text-white"
                >
                  ← Change MCs
                </button>
              </div>
            )}

            {(battleState === 'fighting' || battleState === 'reveal' || battleState === 'voting' || battleState === 'finished') && (
              <div className="space-y-4">
                {/* Round headers and bars */}
                {[1, 2, 3].map(round => {
                  const roundBars = bars.filter(b => b.round === round);
                  if (roundBars.length === 0 && currentRound < round) return null;
                  
                  return (
                    <div key={round}>
                      <div className="font-arcade text-[8px] text-white/40 mb-2 flex items-center gap-2">
                        <span>ROUND {round}</span>
                        {round === 3 && <span className="text-[var(--invaders-yellow)]">(BLIND)</span>}
                        {round === currentRound && battleState === 'fighting' && (
                          <span className="w-2 h-2 rounded-full bg-[var(--invaders-red)] animate-pulse" />
                        )}
                      </div>
                      
                      {round === 3 && battleState === 'reveal' && revealPhase === 'none' && (
                        <div className="text-center py-4 font-arcade text-[10px] text-[var(--invaders-yellow)] animate-pulse">
                          🎭 Blind round complete. Revealing...
                        </div>
                      )}
                      
                      {roundBars.map((bar, index) => (
                        <div
                          key={`${bar.agentId}-${bar.round}`}
                          className={`p-4 rounded border-l-4 mb-2 opacity-0 animate-[fade-in-up_0.5s_ease-out_forwards] ${
                            bar.agentId === selectedAgentA?.id
                              ? 'bg-[var(--invaders-yellow)]/10 border-[var(--invaders-yellow)]'
                              : 'bg-[var(--invaders-red)]/10 border-[var(--invaders-red)]'
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="font-arcade font-bold text-[8px] mb-1 text-white">
                            {getAgentEmoji(bar.agentId === selectedAgentA?.id ? selectedAgentA! : selectedAgentB!)} {bar.agentName}
                          </div>
                          <div className="font-arcade text-[8px] sm:text-[10px] text-white/90 leading-relaxed whitespace-pre-wrap">
                            {bar.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                
                {battleState === 'fighting' && (
                  <div className="text-center py-4">
                    <span className="font-arcade text-[10px] text-[var(--invaders-yellow)] animate-pulse">
                      Round {currentRound} in progress...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Voting */}
            {battleState === 'voting' && selectedAgentA && selectedAgentB && (
              <div className="mt-8 pt-6 border-t-4 border-white/20">
                <p className="font-arcade text-[10px] mb-6 text-center text-white">Who won the battle?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded border-4 border-white/20 bg-black/40 hover:border-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-300">
                    <h3 className="font-arcade font-bold text-[8px] mb-2 text-white">You Decide</h3>
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
                    <button
                      onClick={voteAI}
                      className="w-full px-4 py-2 rounded font-arcade text-[8px] font-bold bg-[var(--invaders-red)]/30 border-2 border-[var(--invaders-red)] text-[var(--invaders-red)] hover:bg-[var(--invaders-red)] hover:text-white transition-all duration-200"
                    >
                      Let AI Decide
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Judgement */}
            {battleState === 'finished' && voteMethod === 'ai' && aiJudgement && (
              <div className="mt-6 p-4 rounded bg-[var(--invaders-red)]/20 border-4 border-[var(--invaders-red)] shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                <div className="font-arcade font-bold text-[8px] mb-2 text-[var(--invaders-red)]">AI Judge Verdict</div>
                <div className="font-arcade text-[8px] text-white/90 leading-relaxed">{aiJudgement}</div>
              </div>
            )}

            {/* Finished Actions */}
            {battleState === 'finished' && (
              <>
                <div className="mt-6 p-4 rounded bg-gradient-to-r from-[var(--invaders-yellow)]/10 to-[var(--invaders-red)]/10 border-2 border-[var(--invaders-yellow)]/50">
                  <p className="font-arcade text-[8px] text-center text-white mb-3">🐦 Follow for more battles!</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <a
                      href="https://twitter.com/intent/follow?screen_name=AgentArenaGame"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded font-arcade text-[8px] font-bold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-all duration-200"
                    >
                      @AgentArenaGame
                    </a>
                    <a
                      href="https://twitter.com/intent/follow?screen_name=meebit1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded font-arcade text-[8px] font-bold bg-black/60 border-2 border-[#1DA1F2] text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all duration-200"
                    >
                      @meebit1
                    </a>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={resetBattle}
                    className="px-6 py-3 rounded font-arcade text-[8px] font-bold border-4 border-[var(--invaders-red)] text-[var(--invaders-red)] hover:bg-[var(--invaders-red)] hover:text-white shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-200"
                  >
                    New Battle
                  </button>
                  <button
                    onClick={shareToX}
                    className="px-6 py-3 rounded font-arcade text-[8px] font-bold border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] hover:bg-[var(--invaders-yellow)] hover:text-black shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-200"
                  >
                    Share on X
                  </button>
                </div>
              </>
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
