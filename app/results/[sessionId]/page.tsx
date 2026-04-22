'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Session, Pick } from '@/lib/types';
import { getPosterUrl } from '@/lib/tmdb';

const BUFFER_MESSAGES = [
  'Picking a fun movie...',
  'Popping the popcorn...',
  'Scanning the library...',
  "Reading everyone's vibe...",
  'Checking the reviews...',
  'Warming up the projector...',
  'Almost there...',
];

function scoreColor(score: number) {
  if (score >= 80) return 'text-[#46d369]';
  if (score >= 55) return 'text-[#f5c518]';
  return 'text-[#ff5b61]';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-[#46d369]/10 border-[#46d369]/40';
  if (score >= 55) return 'bg-[#f5c518]/10 border-[#f5c518]/40';
  return 'bg-[#ff5b61]/10 border-[#ff5b61]/40';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Great match';
  if (score >= 55) return 'Compromise';
  return 'Tough sell';
}

function PosterImage({ posterPath, title }: { posterPath?: string | null; title: string }) {
  const [imgError, setImgError] = useState(false);

  if (!posterPath || imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900 border border-neutral-800 rounded-sm">
        <div className="text-center p-4">
          <div className="text-5xl mb-2">🎬</div>
          <div className="text-neutral-400 text-xs font-bold">{title}</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={getPosterUrl(posterPath) as string}
      alt={title}
      fill
      className="object-cover rounded-sm"
      onError={() => setImgError(true)}
    />
  );
}

function TrailerButton({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold transition-colors mt-2"
    >
      ▶ Watch Trailer
    </a>
  );
}

function PickCard({
  pick,
  rank,
  index,
}: {
  pick: Pick;
  rank: 'top' | 'runner';
  index?: number;
}) {
  const isTop = rank === 'top';
  const [showScorecard, setShowScorecard] = useState(isTop);

  return (
    <div
      className={`rounded-sm border overflow-hidden fade-up ${
        isTop
          ? 'border-[#e50914]/60 bg-[#181818] card-glow'
          : 'border-neutral-800 bg-[#181818]'
      }`}
      style={!isTop ? { animationDelay: `${(index ?? 0) * 0.08}s` } : undefined}
    >
      {isTop && (
        <div className="bg-[#e50914] text-white font-black text-center py-2 text-[11px] tracking-[0.25em] uppercase">
          ⭐ Top Pick · Perfect Match
        </div>
      )}

      <div className="p-5 md:p-6">
        <div className="flex gap-4">
          {/* Poster */}
          <div
            className={`relative shrink-0 rounded-sm overflow-hidden ${
              isTop ? 'w-28 h-40 md:w-36 md:h-52' : 'w-20 h-28'
            }`}
          >
            <PosterImage posterPath={pick.posterPath} title={pick.title} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3
                className={`font-black text-white leading-tight ${
                  isTop ? 'text-2xl md:text-3xl' : 'text-lg'
                }`}
              >
                {!isTop && (
                  <span className="text-neutral-600 mr-2 text-sm font-bold">#{(index ?? 0) + 2}</span>
                )}
                {pick.title}
              </h3>
              <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-sm border tracking-wider uppercase bg-neutral-900 border-neutral-700 text-neutral-300">
                {pick.type === 'movie' ? 'MOVIE' : 'SERIES'}
              </span>
            </div>

            <div className="text-neutral-500 text-xs mb-2 font-semibold">
              {pick.year} · {pick.genre}
            </div>

            <p
              className={`text-neutral-300 text-sm leading-relaxed ${
                isTop ? '' : 'line-clamp-2'
              }`}
            >
              {pick.synopsis}
            </p>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-black ${scoreColor(pick.overallScore)}`}>
                  {pick.overallScore}%
                </div>
                <div className="text-neutral-500 text-xs uppercase tracking-wider">
                  Match
                </div>
              </div>
              <TrailerButton url={pick.trailerUrl} />
            </div>
          </div>
        </div>

        {/* Scorecard (top pick always shows, runners toggle) */}
        {isTop && pick.scorecard.length > 0 && (
          <div className="mt-6">
            <h4 className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em] mb-3">
              The Scorecard
            </h4>
            <div className="space-y-2">
              {pick.scorecard.map((entry) => (
                <div
                  key={entry.person}
                  className={`flex items-start gap-3 rounded-sm border px-4 py-3 ${scoreBg(entry.score)}`}
                >
                  <div className="shrink-0 text-right w-12">
                    <span className={`font-black text-lg ${scoreColor(entry.score)}`}>
                      {entry.score}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm">{entry.person}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{entry.reason}</div>
                  </div>
                  <div className="shrink-0 text-[10px] text-neutral-500 hidden sm:block uppercase tracking-wider">
                    {scoreLabel(entry.score)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Runner-up: mini scores + expandable scorecard */}
        {!isTop && pick.scorecard.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-1.5">
              {pick.scorecard.map((entry) => (
                <span
                  key={entry.person}
                  className={`text-xs px-2.5 py-1 rounded-sm border font-semibold ${scoreBg(entry.score)} ${scoreColor(entry.score)}`}
                >
                  {entry.person}: {entry.score}%
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowScorecard(!showScorecard)}
              className="text-neutral-500 text-xs mt-2 hover:text-neutral-300 transition-colors"
            >
              {showScorecard ? '▲ Hide details' : '▼ Show details'}
            </button>
            {showScorecard && (
              <div className="mt-2 space-y-1.5">
                {pick.scorecard.map((entry) => (
                  <div key={entry.person} className="text-xs text-neutral-400 pl-2 border-l-2 border-neutral-800">
                    <span className="text-white font-bold">{entry.person}:</span> {entry.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [bufferMsgIndex, setBufferMsgIndex] = useState(0);
  const [visibleRunnerUps, setVisibleRunnerUps] = useState(2);
  const [rerunning, setRerunning] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: Session = await res.json();
      setSession(data);

      if (!data.resolved || !data.result) {
        setResolving(true);
        try {
          const rRes = await fetch(`/api/resolve/${sessionId}`, { method: 'POST' });
          if (rRes.ok) {
            const updated = await fetch(`/api/sessions/${sessionId}`);
            if (updated.ok) setSession(await updated.json());
          }
        } finally {
          setResolving(false);
        }
      }
      setLoading(false);
    }
    load();
  }, [sessionId]);

  // Cycle buffering messages
  useEffect(() => {
    if (!resolving && !loading) return;
    const id = setInterval(
      () => setBufferMsgIndex((i) => (i + 1) % BUFFER_MESSAGES.length),
      1500
    );
    return () => clearInterval(id);
  }, [resolving, loading]);

  async function handleWatchAgain() {
    setRerunning(true);
    try {
      const res = await fetch(`/api/rerun/${sessionId}`, { method: 'POST' });
      if (res.ok) {
        // Re-resolve with same preferences
        setResolving(true);
        setVisibleRunnerUps(2);
        const rRes = await fetch(`/api/resolve/${sessionId}`, { method: 'POST' });
        if (rRes.ok) {
          const updated = await fetch(`/api/sessions/${sessionId}`);
          if (updated.ok) setSession(await updated.json());
        }
        setResolving(false);
      }
    } finally {
      setRerunning(false);
    }
  }

  if (loading || resolving) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-6 px-4 fade-up">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-800" />
          <div
            className="absolute inset-0 rounded-full border-4 border-t-[#e50914] border-r-[#e50914] border-transparent animate-spin"
            style={{ animationDuration: '1.2s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🎬</div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 min-h-[2.5rem]">
            {BUFFER_MESSAGES[bufferMsgIndex]}
          </h2>
          <p className="text-neutral-500 text-sm max-w-xs">
            Comparing everyone&apos;s vibe to find the perfect pick
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#e50914] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-4">
        <div className="text-5xl">🤔</div>
        <h2 className="text-2xl font-black text-white">No results yet</h2>
        <p className="text-neutral-400 text-sm">
          The host needs to click &quot;Find Our Pick&quot; first.
        </p>
        <a
          href={`/session/${sessionId}`}
          className="btn-primary text-white px-6 py-3 rounded-sm font-bold"
        >
          Go to Host Dashboard
        </a>
      </div>
    );
  }

  const { topPick, runnerUps } = session.result;
  const totalRunnerUps = runnerUps?.length ?? 0;
  const hasMore = visibleRunnerUps < totalRunnerUps;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 fade-up">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-block mb-3 text-[10px] text-[#e50914] font-bold tracking-[0.2em] uppercase">
          🎬 The Verdict
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          Tonight&apos;s <span className="gradient-text">Lineup</span>
        </h1>
        <p className="text-neutral-400 mt-3 text-sm">
          Analyzed {session.submissions.length}{' '}
          {session.submissions.length === 1 ? 'preference' : 'preferences'} · {totalRunnerUps + 1} picks ranked for your group
        </p>
      </div>

      {/* Top pick */}
      <div className="mb-10">
        <PickCard pick={topPick} rank="top" />
      </div>

      {/* Runner-ups — "Tonight's Lineup" */}
      {totalRunnerUps > 0 && (
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.25em]">
              Also on the Shortlist
            </h2>
            <div className="divider-line w-16 mx-auto mt-2" />
          </div>
          <div className="space-y-4">
            {runnerUps.slice(0, visibleRunnerUps).map((pick, i) => (
              <PickCard key={i} pick={pick} rank="runner" index={i} />
            ))}
          </div>

          {/* "Next Best" button */}
          {hasMore && (
            <button
              onClick={() => setVisibleRunnerUps((v) => Math.min(v + 3, totalRunnerUps))}
              className="w-full mt-4 py-3 rounded-sm border border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors text-sm font-semibold"
            >
              ▼ Show Next Best ({totalRunnerUps - visibleRunnerUps} more)
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <a
          href="/"
          className="flex-1 btn-ghost font-bold py-3 rounded-sm text-center"
        >
          🏠 New Session
        </a>
        <button
          onClick={handleWatchAgain}
          disabled={rerunning}
          className="flex-1 btn-ghost font-bold py-3 rounded-sm"
        >
          {rerunning ? '🔄 Re-picking...' : '🔄 Watch Again (New Picks)'}
        </button>
        <button
          onClick={() =>
            navigator.share?.({ title: 'GroupPick Result', url: window.location.href }).catch(() => {})
          }
          className="flex-1 btn-primary text-white font-bold py-3 rounded-sm"
        >
          📤 Share
        </button>
      </div>

      <p className="text-center text-neutral-700 text-[10px] mt-6 tracking-[0.15em] uppercase">
        GroupPick · Stop Arguing, Start Watching
      </p>
    </div>
  );
}
