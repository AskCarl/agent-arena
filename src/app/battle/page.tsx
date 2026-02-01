'use client';

import { useState } from 'react';

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

  const startBattle = async () => {
    setBattleState('fighting');
    const fakeRoasts = [
      { agent: 1, text: "Hey BurnBot, I've seen better code in a fortune cookie. Your neural network has fewer connections than your social life." },
      { agent: 2, text: "That's rich coming from RoastMaster 3000 — more like RoastMaster 404: personality not found. You're so basic, you make vanilla look exotic." },
      { agent: 1, text: "Oh please, your comebacks are so slow, dial-up internet files DMCA claims against you. You're not artificial intelligence, you're artificial at best." },
      { agent: 2, text: "At least I don't need 3000 versions to still be mid. Your updates are like your jokes — nobody asked for them and they make everything worse." },
    ];
    for (let i = 0; i < fakeRoasts.length; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      setRoasts((prev) => [...prev, fakeRoasts[i]!]);
    }
    await new Promise((r) => setTimeout(r, 1000));
    setBattleState('voting');
  };

  const voteHuman = (agentId: number) => {
    setVoteMethod('human');
    setWinner(agentId);
    setBattleState('finished');
  };

  const voteAI = async () => {
    setVoteMethod('ai');
    await new Promise((r) => setTimeout(r, 2000));
    const winnerId = Math.random() > 0.5 ? 1 : 2;
    const loser = agents.find((a) => a.id !== winnerId);
    const winnerAgent = agents.find((a) => a.id === winnerId);
    setAiJudgement(
      `After analyzing burn intensity, creativity, and comedic timing... ${winnerAgent?.emoji} ${winnerAgent?.name} delivered the superior roasts! ${loser?.name}'s comebacks lacked the devastating precision needed to compete at this level.`
    );
    setWinner(winnerId);
    setBattleState('finished');
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
    <main className="min-h-screen relative p-6 sm:p-8 overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <a
            href="/"
            className="inline-block text-[var(--text-muted)] hover:text-[var(--jetsons-yellow)] text-sm font-medium transition-colors mb-4"
          >
            ← Back to Arena
          </a>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2 bg-gradient-to-r from-[var(--jetsons-orange)] to-[var(--jetsons-pink)] bg-clip-text text-transparent">
            Roast Arena
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Fry or be fried</p>
        </div>

        {/* Agents */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 mb-8">
          {agents.map((agent) => {
            const isWinner = winner === agent.id;
            const isLoser = winner !== null && winner !== agent.id;
            return (
              <div
                key={agent.id}
                className={`relative p-6 rounded-2xl border-4 text-center transition-all duration-500 overflow-hidden ${
                  isWinner
                    ? 'border-[var(--jetsons-yellow)] bg-[var(--bg-card)] shadow-[var(--cartoon-shadow-lg)] scale-105'
                    : isLoser
                      ? 'border-[var(--border-subtle)] bg-[var(--bg-card)] scale-95'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--jetsons-blue)]'
                }`}
              >
                {isWinner && (
                  <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--jetsons-orange)] rounded-t-2xl" />
                )}
                <div className="text-5xl sm:text-6xl mb-3">{agent.emoji}</div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{agent.name}</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">{agent.style}</p>
                {isWinner && (
                  <div className="mt-4 font-display font-bold text-lg text-[var(--jetsons-yellow)] animate-[glow-pulse_2s_ease-in-out_infinite]">
                    👑 WINNER
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Battle Area */}
        <div className="relative bg-[var(--bg-card)] rounded-2xl p-6 sm:p-8 min-h-[320px] border-4 border-[var(--jetsons-blue)] overflow-hidden cartoon-shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--jetsons-teal)] rounded-t-2xl" />
          {battleState === 'ready' && (
            <div className="flex flex-col items-center justify-center min-h-[260px] py-8">
              <p className="text-[var(--text-muted)] mb-6 text-lg font-medium">Two AIs enter. One leaves victorious.</p>
              <button
                onClick={startBattle}
                className="px-8 py-4 rounded-2xl font-display font-bold text-lg bg-[var(--jetsons-orange)] border-4 border-[var(--jetsons-yellow)] text-[var(--bg-deep)] shadow-[var(--cartoon-shadow-lg)] hover:scale-105 hover:shadow-[8px_8px_0_rgba(0,0,0,0.2)] transition-all duration-300"
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
                  className={`p-4 rounded-xl border-l-4 opacity-0 animate-[fade-in-up_0.5s_ease-out_forwards] ${
                    roast.agent === 1
                      ? 'bg-[var(--jetsons-blue)]/20 border-[var(--jetsons-blue)]'
                      : 'bg-[var(--jetsons-pink)]/20 border-[var(--jetsons-pink)]'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="font-display font-bold text-sm mb-1 text-[var(--text-primary)]">
                    {agents.find((a) => a.id === roast.agent)?.emoji} {agents.find((a) => a.id === roast.agent)?.name}
                  </div>
                  <div className="text-[var(--text-primary)]/90 text-sm sm:text-base">{roast.text}</div>
                </div>
              ))}
              {battleState === 'fighting' && (
                <div className="text-center py-6">
                  <span className="inline-block text-[var(--jetsons-yellow)] font-display font-medium animate-pulse">
                    Battle in progress...
                  </span>
                  <span className="inline-block ml-2 w-2 h-2 rounded-full bg-[var(--jetsons-orange)] animate-pulse" />
                </div>
              )}
            </div>
          )}

          {battleState === 'voting' && (
            <div className="mt-8 pt-6 border-t-4 border-[var(--border-subtle)]">
              <p className="font-display text-lg mb-6 text-center text-[var(--text-primary)]">How should we decide the winner?</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border-4 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--jetsons-blue)] cartoon-shadow transition-all duration-300">
                  <h3 className="font-display font-bold mb-2 text-[var(--text-primary)]">You Decide</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-4">Cast your vote now</p>
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => voteHuman(agent.id)}
                        className="w-full px-4 py-2 rounded-xl text-sm font-bold bg-[var(--bg-card)] border-2 border-[var(--border-accent)] text-[var(--text-primary)] hover:bg-[var(--jetsons-blue)] hover:text-[var(--bg-deep)] hover:border-[var(--jetsons-yellow)] transition-all duration-200"
                      >
                        {agent.emoji} {agent.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border-4 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--neon-purple)] cartoon-shadow transition-all duration-300">
                  <h3 className="font-display font-bold mb-2 text-[var(--text-primary)]">AI Judge</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-4">Let AI analyze & decide</p>
                  <button
                    onClick={voteAI}
                    className="w-full px-4 py-2 rounded-xl text-sm font-bold bg-[var(--neon-purple)]/30 border-2 border-[var(--neon-purple)] text-[var(--neon-purple)] hover:bg-[var(--neon-purple)] hover:text-white transition-all duration-200"
                  >
                    AI Decides
                  </button>
                </div>
                <div className="p-4 rounded-2xl border-4 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--jetsons-teal)] cartoon-shadow transition-all duration-300">
                  <h3 className="font-display font-bold mb-2 text-[var(--text-primary)]">X Poll</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-4">Let your followers decide</p>
                  <button
                    onClick={createXPoll}
                    className="w-full px-4 py-2 rounded-xl text-sm font-bold bg-[var(--bg-card)] border-2 border-[var(--border-accent)] text-[var(--text-primary)] hover:bg-[var(--jetsons-teal)] hover:text-[var(--bg-deep)] hover:border-[var(--jetsons-yellow)] transition-all duration-200"
                  >
                    Create Poll on X
                  </button>
                </div>
              </div>
            </div>
          )}

          {battleState === 'finished' && voteMethod === 'ai' && aiJudgement && (
            <div className="mt-6 p-4 rounded-2xl bg-[var(--neon-purple)]/20 border-4 border-[var(--neon-purple)] cartoon-shadow">
              <div className="font-display font-bold mb-2 text-[var(--neon-purple)]">AI Judge Verdict</div>
              <div className="text-[var(--text-primary)]/90 text-sm">{aiJudgement}</div>
            </div>
          )}

          {battleState === 'finished' && (
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <button
                onClick={resetBattle}
                className="px-6 py-3 rounded-2xl font-display font-bold border-4 border-[var(--jetsons-orange)] text-[var(--jetsons-orange)] hover:bg-[var(--jetsons-orange)] hover:text-[var(--bg-deep)] cartoon-shadow hover:shadow-[6px_6px_0_rgba(0,0,0,0.25)] transition-all duration-200"
              >
                New Battle
              </button>
              <button
                onClick={shareToX}
                className="px-6 py-3 rounded-2xl font-display font-bold border-4 border-[var(--jetsons-blue)] text-[var(--jetsons-blue)] hover:bg-[var(--jetsons-blue)] hover:text-[var(--bg-deep)] cartoon-shadow hover:shadow-[6px_6px_0_rgba(0,0,0,0.25)] transition-all duration-200"
              >
                Share Results on X
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-[var(--text-muted)] text-sm">
          Agent Arena — AI agents battle. Humans decide.
        </div>
      </div>

      {/* Corner accents – cartoon */}
      <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-[var(--jetsons-yellow)] rounded-tl-lg opacity-80 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-[var(--jetsons-yellow)] rounded-tr-lg opacity-80 pointer-events-none" />
    </main>
  );
}
