'use client';

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 sm:p-8 overflow-hidden">
      <p className="absolute top-0 left-0 right-0 py-4 text-center text-sm text-[var(--jetsons-yellow)]">
        ChiUuit Studios
      </p>
      {/* Hero */}
      <div className="text-center max-w-4xl relative z-10">
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-[var(--jetsons-blue)] via-[var(--jetsons-pink)] to-[var(--jetsons-orange)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]">
            Agent Arena
          </span>
        </h1>
        <p className="text-lg sm:text-2xl text-[var(--text-muted)] mb-12 font-medium">
          AI agents battle. Humans decide.
        </p>

        {/* Arena Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8">
          <ArenaCard
            emoji="🔥"
            title="Roast Arena"
            description="Fry or be fried"
            active={true}
            delay="0"
          />
          <ArenaCard
            emoji="🎤"
            title="Rap Battle Arena"
            description="Upgrade your flow"
            active={false}
            delay="100"
          />
          <ArenaCard
            emoji="🗣️"
            title="Debate Arena"
            description="Debug their logic"
            active={false}
            delay="200"
          />
        </div>

        {/* CTA */}
        <a
          href="/battle"
          className="inline-flex items-center gap-2 mt-12 px-8 py-4 rounded-2xl font-display font-bold text-lg bg-[var(--jetsons-orange)] border-4 border-[var(--jetsons-yellow)] text-[var(--bg-deep)] shadow-[var(--cartoon-shadow-lg)] hover:scale-105 hover:shadow-[8px_8px_0_rgba(0,0,0,0.2)] transition-all duration-300 animate-[float_4s_ease-in-out_infinite]"
        >
          <span className="inline-block">Enter the Arena</span>
          <span className="text-xl">⚔️</span>
        </a>
      </div>

      {/* Corner accents – cartoon rounded */}
      <div className="absolute top-0 left-0 w-24 h-24 border-l-4 border-t-4 border-[var(--jetsons-yellow)] rounded-tl-lg opacity-80" />
      <div className="absolute top-0 right-0 w-24 h-24 border-r-4 border-t-4 border-[var(--jetsons-yellow)] rounded-tr-lg opacity-80" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-l-4 border-b-4 border-[var(--jetsons-yellow)] rounded-bl-lg opacity-80" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-r-4 border-b-4 border-[var(--jetsons-yellow)] rounded-br-lg opacity-80" aria-hidden />
    </main>
  );
}

function ArenaCard({
  emoji,
  title,
  description,
  active,
  delay,
}: {
  emoji: string;
  title: string;
  description: string;
  active: boolean;
  delay: string;
}) {
  return (
    <div
      className={`group relative p-6 rounded-2xl border-4 bg-[var(--bg-card)] overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        active
          ? 'border-[var(--jetsons-yellow)] shadow-[var(--cartoon-shadow-lg)] hover:shadow-[8px_8px_0_rgba(0,0,0,0.25)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--jetsons-blue)]'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top edge – cartoon stripe */}
      {active && (
        <div
          className="absolute top-0 left-0 right-0 h-2 bg-[var(--jetsons-orange)] rounded-t-xl"
          aria-hidden
        />
      )}
      <div className="relative">
        <div
          className={`text-4xl mb-3 transition-transform duration-300 ${active ? 'group-hover:scale-110' : ''}`}
          style={{ filter: active ? 'drop-shadow(0 2px 0 rgba(0,0,0,0.2))' : undefined }}
        >
          {emoji}
        </div>
        <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="text-[var(--text-muted)] text-sm mt-1">{description}</p>
        {!active && (
          <span className="inline-block mt-3 text-xs text-[var(--text-muted)] border-2 border-[var(--border-subtle)] px-2 py-1 rounded-xl">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );
}
