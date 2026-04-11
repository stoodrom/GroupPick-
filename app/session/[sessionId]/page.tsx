'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { MOOD_OPTIONS } from '@/lib/types';

function getMoodEmoji(mood: string) {
  return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji ?? '🎭';
}

// Cycling "buffering" messages shown while the AI resolves a pick
const BUFFER_MESSAGES = [
  'Picking a fun movie...',
  'Popping the popcorn...',
  'Scanning the library...',
  'Reading everyone\'s vibe...',
  'Checking the reviews...',
  'Warming up the projector...',
  'Almost there...',
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Setup: enter group member names
// ─────────────────────────────────────────────────────────────────────────────
function SetupPhase({
  sessionId,
  onDone,
}: {
  sessionId: string;
  onDone: (session: Session) => void;
}) {
  const [names, setNames] = useState<string[]>(['', '']);
  const [saving, setSaving] = useState(false);

  function addSlot() {
    setNames((prev) => [...prev, '']);
  }

  function removeSlot(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }

  const validNames = names.map((n) => n.trim()).filter(Boolean);

  async function save() {
    if (validNames.length < 1) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupNames: validNames }),
      });
      if (res.ok) {
        const session: Session = await res.json();
        onDone(session);
      } else {
        alert('Failed to save group. Try again!');
      }
    } catch {
      alert('Network error. Try again!');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 fade-up">
      <div className="text-center mb-8">
        <div className="inline-block mb-3 text-[10px] text-[#e50914] font-bold tracking-[0.2em] uppercase">
          Cast &amp; Crew
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">Who&apos;s watching?</h1>
        <p className="text-neutral-400 mt-3 text-sm">Enter the names of everyone in your group</p>
      </div>

      <div className="nf-card rounded-sm p-5 space-y-3">
        {names.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={`Person ${i + 1}`}
              maxLength={40}
              className="flex-1 bg-black/40 border border-neutral-800 rounded-sm px-4 py-3 text-white placeholder-neutral-600 outline-none focus:border-[#e50914] transition-colors"
            />
            {names.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="px-3 rounded-sm border border-neutral-800 text-neutral-500 hover:text-[#e50914] hover:border-[#e50914] transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addSlot}
          className="w-full py-3 rounded-sm border border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors text-sm font-semibold"
        >
          + Add Person
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving || validNames.length < 1}
        className="w-full mt-6 btn-primary text-white font-black text-lg py-4 rounded-sm"
      >
        {saving ? 'Saving...' : `Continue with ${validNames.length} ${validNames.length === 1 ? 'person' : 'people'} →`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Collect preferences + Resolve
// ─────────────────────────────────────────────────────────────────────────────
function CollectPhase({
  session: initialSession,
  sessionId,
}: {
  session: Session;
  sessionId: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<Session>(initialSession);
  const [resolving, setResolving] = useState(false);
  const [bufferMsgIndex, setBufferMsgIndex] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const joinLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${sessionId}`
      : `/join/${sessionId}`;

  // Poll for new submissions
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data: Session = await res.json();
      setSession(data);
      if (data.resolved) router.push(`/results/${sessionId}`);
    } catch {
      // ignore
    }
  }, [sessionId, router]);

  useEffect(() => {
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  // Cycle through buffering messages while resolving
  useEffect(() => {
    if (!resolving) return;
    const id = setInterval(
      () => setBufferMsgIndex((i) => (i + 1) % BUFFER_MESSAGES.length),
      1500
    );
    return () => clearInterval(id);
  }, [resolving]);

  const submittedNames = new Set(session.submissions.map((s) => s.name.toLowerCase()));
  const pendingNames = session.groupNames.filter(
    (n) => !submittedNames.has(n.toLowerCase())
  );
  const totalExpected = session.groupNames.length;
  const submittedCount = session.submissions.length;

  async function resolve() {
    if (submittedCount === 0) {
      setError('Need at least one submission before resolving!');
      return;
    }
    setResolving(true);
    setBufferMsgIndex(0);
    setError('');
    try {
      const res = await fetch(`/api/resolve/${sessionId}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Something went wrong');
        return;
      }
      router.push(`/results/${sessionId}`);
    } catch {
      setError('Network error. Try again!');
    } finally {
      setResolving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 fade-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block mb-3 text-[10px] text-[#e50914] font-bold tracking-[0.2em] uppercase">
          Host Dashboard
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">The Control Room</h1>
        <p className="text-neutral-400 mt-3 text-sm">
          <span className="text-white font-bold">{submittedCount}</span> of {totalExpected} submitted
        </p>
      </div>

      {/* Members list */}
      <div className="nf-card rounded-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em]">
            Group Members
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e50914] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e50914]" />
            </span>
            <span className="text-[#e50914] text-[10px] font-bold tracking-widest uppercase">Live</span>
          </div>
        </div>

        <div className="space-y-2">
          {session.groupNames.map((name) => {
            const sub = session.submissions.find(
              (s) => s.name.toLowerCase() === name.toLowerCase()
            );
            const done = !!sub;

            return (
              <div
                key={name}
                className="flex items-center gap-3 bg-black/40 border border-neutral-900 rounded-sm p-3"
              >
                <span className="text-2xl">{done ? getMoodEmoji(sub!.mood) : '⏳'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{name}</div>
                  <div className="text-neutral-500 text-xs">
                    {done
                      ? `${sub!.contentType === 'both' ? 'Movie or Series' : sub!.contentType === 'movie' ? 'Movies only' : 'Series only'}${sub!.likedGenres.length > 0 ? ` · Loves ${sub!.likedGenres.slice(0, 2).join(', ')}` : ''}`
                      : 'Waiting for submission...'}
                  </div>
                </div>
                {done ? (
                  <span className="text-[#e50914] text-lg font-bold">✓</span>
                ) : (
                  <a
                    href={`/join/${sessionId}?name=${encodeURIComponent(name)}`}
                    className="px-3 py-1.5 rounded-sm bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold transition-colors shrink-0"
                  >
                    Fill Now →
                  </a>
                )}
              </div>
            );
          })}

          {/* Extra submissions not in groupNames */}
          {session.submissions
            .filter((s) => !session.groupNames.some((n) => n.toLowerCase() === s.name.toLowerCase()))
            .map((sub) => (
              <div key={sub.name} className="flex items-center gap-3 bg-black/40 border border-neutral-900 rounded-sm p-3">
                <span className="text-2xl">{getMoodEmoji(sub.mood)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{sub.name}</div>
                  <div className="text-neutral-500 text-xs">Joined via link</div>
                </div>
                <span className="text-[#e50914] text-lg font-bold">✓</span>
              </div>
            ))}
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-900 text-center text-neutral-500 text-xs">
          {submittedCount} {submittedCount === 1 ? 'person has' : 'people have'} submitted · refreshes every 5s
        </div>
      </div>

      {/* Pass the phone hint */}
      {pendingNames.length > 0 && (
        <div className="nf-card rounded-sm p-5 mb-6 text-center border-[#e50914]/30">
          <p className="text-[#e50914] font-bold text-[11px] uppercase tracking-[0.15em] mb-2">📱 Pass the Phone</p>
          <p className="text-neutral-400 text-xs mb-4">
            Tap a name below to fill their preferences on this device
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {pendingNames.map((name) => (
              <a
                key={name}
                href={`/join/${sessionId}?name=${encodeURIComponent(name)}`}
                className="px-4 py-2 rounded-sm bg-[#e50914] hover:bg-[#f40612] text-white text-sm font-bold transition-colors"
              >
                {name}&apos;s Turn
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Share link */}
      <div className="nf-card rounded-sm p-5 mb-6">
        <p className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em] mb-3">
          🔗 Or share for remote friends
        </p>
        <div className="flex gap-2 bg-black/40 border border-neutral-900 rounded-sm p-3">
          <input
            readOnly
            value={joinLink}
            className="flex-1 bg-transparent text-neutral-300 text-sm outline-none truncate"
          />
          <button
            onClick={copyLink}
            className="shrink-0 px-4 py-1.5 rounded-sm bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#e50914]/10 border border-[#e50914]/50 rounded-sm p-4 mb-4 text-[#ff5b61] text-sm text-center">
          {error}
        </div>
      )}

      {/* Resolve button */}
      <button
        onClick={resolve}
        disabled={resolving || submittedCount === 0}
        className="w-full btn-primary text-white font-black text-xl py-5 rounded-sm glow-pulse"
      >
        {resolving ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {BUFFER_MESSAGES[bufferMsgIndex]}
          </span>
        ) : (
          <>▶  Find Our Pick{submittedCount > 0 ? `  (${submittedCount})` : ''}</>
        )}
      </button>
      {submittedCount === 0 && (
        <p className="text-center text-neutral-600 text-xs mt-2">
          Need at least 1 submission to resolve
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component — switches between phases
// ─────────────────────────────────────────────────────────────────────────────
export default function HostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(async (r) => {
        if (r.ok) setSession(await r.json());
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-neutral-400 animate-pulse text-lg">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-4">
        <div className="text-5xl">😬</div>
        <h2 className="text-2xl font-black text-white">Session not found</h2>
        <p className="text-neutral-400">This link may have expired or is invalid.</p>
        <a href="/" className="btn-primary text-white px-6 py-3 rounded-sm font-bold">Go Home</a>
      </div>
    );
  }

  // If group names haven't been set yet → setup phase
  if (session.groupNames.length === 0) {
    return <SetupPhase sessionId={sessionId} onDone={setSession} />;
  }

  // Otherwise → collection / resolve phase
  return <CollectPhase session={session} sessionId={sessionId} />;
}
