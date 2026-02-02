'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '@/lib/sounds';

const agents = [
  { id: 1, name: 'RoastMaster 3000', emoji: '🤖', style: 'Savage and clever' },
  { id: 2, name: 'BurnBot', emoji: '🔥', style: 'Quick-witted and brutal' },
];

export default function BattlePage() {
  const [battleState, setBattleState] = useState<'ready' | 'fighting' | 'voting' | 'finished'>('ready');
  const [roasts, setRoasts] = useState<{ agent: number; text: string }[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [voteMethod, setVoteMethod] = useState<'human' | 'ai' | null>(null);
  const [aiJudgement, setAiJudgement] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync sound state
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const startBattle = async () => {
    soundManager.play('battleStart');
    setBattleState('fighting');
    const battleRoasts: { agent: number; text: string }[] = [];
    
    // 4 rounds: alternating between agents
    const rounds = [1, 2, 1, 2];
    
    for (const agentId of rounds) {
      const agent = agents.find((a) => a.id === agentId)!;
      const opponent = agents.find((a) => a.id !== agentId)!;
      
      try {
        const res = await fetch('/api/roast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: agent.name,
            agentStyle: agent.style,
            opponentName: opponent.name,
            previousRoasts: battleRoasts.map((r) => ({
              agent: agents.find((a) => a.id === r.agent)?.name,
              text: r.text,
            })),
          }),
        });
        
        const data = await res.json();
        const newRoast = { agent: agentId, text: data.roast || 'Failed to generate roast...' };
        battleRoasts.push(newRoast);
        setRoasts([...battleRoasts]);
        soundManager.play('roastDrop');
      } catch (error) {
        console.error('Roast error:', error);
        const newRoast = { agent: agentId, text: '...*microphone malfunction*...' };
        battleRoasts.push(newRoast);
        setRoasts([...battleRoasts]);
      }
      
      // Small delay between roasts for dramatic effect
      await new Promise((r) => setTimeout(r, 500));
    }
    
    setBattleState('voting');
  };

  const voteHuman = (agentId: number) => {
    soundManager.play('vote');
    setVoteMethod('human');
    setWinner(agentId);
    setBattleState('finished');
    setTimeout(() => soundManager.play('winner'), 300);
  };

  const voteAI = async () => {
    soundManager.play('vote');
    setVoteMethod('ai');
    // Countdown ticks during "thinking"
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 600));
      soundManager.play('countdown');
    }
    await new Promise((r) => setTimeout(r, 400));
    const winnerId = Math.random() > 0.5 ? 1 : 2;
    const loser = agents.find((a) => a.id !== winnerId);
    const winnerAgent = agents.find((a) => a.id === winnerId);
    setAiJudgement(
      `After analyzing burn intensity, creativity, and comedic timing... ${winnerAgent?.emoji} ${winnerAgent?.name} delivered the superior roasts! ${loser?.name}'s comebacks lacked the devastating precision needed to compete at this level.`
    );
    setWinner(winnerId);
    setBattleState('finished');
    soundManager.play('winner');
  };

  const shareToX = () => {
    const winnerAgent = agents.find((a) => a.id === winner);
    const loserAgent = agents.find((a) => a.id !== winner);
    const tweetText = `🔥 ROAST BATTLE RESULTS 🔥\n\n${winnerAgent?.emoji} ${winnerAgent?.name} just DESTROYED ${loserAgent?.emoji} ${loserAgent?.name}!\n\nThink you can do better? Enter the arena 👇\nhttps://agent-arena-nu.vercel.app\n\n#AgentArena #AIBattle #RoastBattle`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const createXPoll = () => {
    const tweetText = `🔥 WHO WON THIS ROAST BATTLE? 🔥\n\n🤖 RoastMaster 3000:\n"Your neural network has fewer connections than your social life"\n\n🔥 BurnBot:\n"You're not artificial intelligence, you're artificial at best"\n\nVote below! 👇\n\n#AgentArena #AIBattle`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const resetBattle = () => {
    setBattleState('ready');
    setRoasts([]);
    setWinner(null);
    setVoteMethod(null);
    setAiJudgement('');
  };

  return (
    <main className="min-h-screen relative p-6 sm:p-8 overflow-hidden bg-invaders text-white">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header – Space Invaders style */}
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
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-0 right-0 p-2 text-xl opacity-60 hover:opacity-100 transition-opacity"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Agents */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 mb-8">
          {agents.map((agent) => {
            const isWinner = winner === agent.id;
            const isLoser = winner !== null && winner !== agent.id;
            return (
              <div
                key={agent.id}
                className={`relative p-6 rounded border-4 text-center transition-all duration-500 overflow-hidden ${
                  isWinner
                    ? 'border-[var(--invaders-yellow)] bg-black/40 shadow-[4px_4px_0_var(--invaders-red)] scale-105'
                    : isLoser
                      ? 'border-white/20 bg-black/40 scale-95'
                      : 'border-white/20 bg-black/40 hover:border-[var(--invaders-yellow)]/60'
                }`}
              >
                {isWinner && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
                )}
                <div className="text-5xl sm:text-6xl mb-3">{agent.emoji}</div>
                <h2 className="font-arcade text-sm font-bold text-white">{agent.name}</h2>
                <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mt-1 leading-relaxed">{agent.style}</p>
                {isWinner && (
                  <div className="mt-4 font-arcade text-[8px] font-bold text-[var(--invaders-yellow)] animate-[glow-pulse_2s_ease-in-out_infinite]">
                    👑 WINNER
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Battle Area */}
        <div className="relative bg-black/40 rounded p-6 sm:p-8 min-h-[320px] border-4 border-[var(--invaders-yellow)] overflow-hidden shadow-[4px_4px_0_var(--invaders-red)]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--invaders-red)]" />
          {battleState === 'ready' && (
            <div className="flex flex-col items-center justify-center min-h-[260px] py-8">
              <p className="font-arcade text-[10px] text-[var(--invaders-yellow)] mb-6">Clawdown: Two bots enter, one code remains!</p>
              <button
                onClick={startBattle}
                className="px-8 py-4 rounded font-arcade text-sm font-bold bg-[var(--invaders-red)] border-4 border-[var(--invaders-yellow)] text-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:scale-105 transition-all duration-300"
              >
                Start Battle ⚔️
              </button>
            </div>
          )}

          {(battleState === 'fighting' || battleState === 'voting' || battleState === 'finished') && (
            <div className="space-y-4">
              {roasts.map((roast, index) => (
                <div
                  key={index}
                  className={`p-4 rounded border-l-4 opacity-0 animate-[fade-in-up_0.5s_ease-out_forwards] ${
                    roast.agent === 1
                      ? 'bg-[var(--invaders-yellow)]/10 border-[var(--invaders-yellow)]'
                      : 'bg-[var(--invaders-red)]/10 border-[var(--invaders-red)]'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="font-arcade font-bold text-[8px] mb-1 text-white">
                    {agents.find((a) => a.id === roast.agent)?.emoji} {agents.find((a) => a.id === roast.agent)?.name}
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

          {battleState === 'voting' && (
            <div className="mt-8 pt-6 border-t-4 border-white/20">
              <p className="font-arcade text-[10px] mb-6 text-center text-white">How should we decide the winner?</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded border-4 border-white/20 bg-black/40 hover:border-[var(--invaders-yellow)] shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition-all duration-300">
                  <h3 className="font-arcade font-bold text-[8px] mb-2 text-white">You Decide</h3>
                  <p className="font-arcade text-[8px] text-[var(--invaders-yellow)] mb-4">Cast your vote now</p>
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => voteHuman(agent.id)}
                        className="w-full px-4 py-2 rounded font-arcade text-[8px] font-bold bg-black/60 border-2 border-[var(--invaders-yellow)] text-white hover:bg-[var(--invaders-red)] hover:border-[var(--invaders-red)] transition-all duration-200"
                      >
                        {agent.emoji} {agent.name}
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

        <div className="mt-8 text-center font-arcade text-[8px] text-[var(--invaders-yellow)]">
          Agent Arena — AI agents battle. Humans decide.
        </div>
      </div>

      {/* Corner accents – arcade frame */}
      <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-[var(--invaders-red)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-[var(--invaders-red)] pointer-events-none" />
    </main>
  );
}
