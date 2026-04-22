'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', { method: 'POST' });
      const data = await res.json();
      router.push(`/session/${data.id}`);
    } catch {
      alert('Failed to create session. Try again!');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] px-4 py-16 fade-up">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-block mb-4 px-3 py-1 rounded-sm bg-[#e50914]/15 border border-[#e50914]/40 text-[#e50914] text-[11px] font-bold tracking-[0.15em] uppercase">
          🎬 Now Streaming Drama-Free Nights
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 leading-[1.05] tracking-tight">
          Stop arguing.
          <br />
          <span className="gradient-text">Start watching.</span>
        </h1>
        <p className="text-neutral-300 text-lg md:text-xl mt-5 leading-relaxed max-w-xl mx-auto">
          Everyone in your group drops their mood &amp; vibe. We&apos;ll find{' '}
          <span className="text-white font-semibold">the one movie or show</span> you all can agree on.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={startSession}
        disabled={loading}
        className="btn-primary font-bold text-lg px-10 py-4 rounded-md glow-pulse"
      >
        {loading ? (
          <span className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting...
          </span>
        ) : (
          <>▶  Start Watch Party</>
        )}
      </button>
      <p className="text-neutral-500 text-xs mt-3">
        Free · No signup · ~60 seconds ·{' '}
        <a href="/admin" className="text-neutral-600 hover:text-neutral-400 transition-colors underline">
          Analytics
        </a>
      </p>

      {/* How it works */}
      <div className="mt-20 w-full max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-[#e50914] font-bold text-xs uppercase tracking-[0.2em]">How it works</h2>
          <div className="divider-line w-24 mx-auto mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', emoji: '👥', title: 'Add Your Group', desc: 'Enter the names of everyone in the room' },
            { step: '02', emoji: '📱', title: 'Pass or Share', desc: 'Pass the phone around, or share a link with remote friends' },
            { step: '03', emoji: '📝', title: 'Everyone Votes', desc: 'Each person picks their mood, genres, and vibe' },
            { step: '04', emoji: '🎬', title: 'We Pick', desc: 'Our AI finds the perfect match for the whole group' },
          ].map((item) => (
            <div
              key={item.step}
              className="nf-card rounded-sm p-6 text-center hover:border-[#e50914]/60 transition-all hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{item.emoji}</div>
              <div className="text-[10px] text-[#e50914] font-mono mb-1 tracking-widest">EPISODE {item.step}</div>
              <h3 className="font-bold text-white mb-2 text-base">{item.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
