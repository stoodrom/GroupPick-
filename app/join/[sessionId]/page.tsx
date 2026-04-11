'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { MOOD_OPTIONS, GENRE_OPTIONS, CURATED_OPTIONS } from '@/lib/types';
import type { Mood, ContentType, Session } from '@/lib/types';

function GenreChip({
  genre,
  state,
  onToggle,
}: {
  genre: string;
  state: 'love' | 'hate' | null;
  onToggle: (genre: string, action: 'love' | 'hate') => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onToggle(genre, 'love')}
        className={`px-3 py-1.5 rounded-sm text-sm font-semibold border transition-all ${
          state === 'love'
            ? 'bg-[#e50914] border-[#e50914] text-white'
            : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/40'
        }`}
      >
        {state === 'love' ? '❤ ' : '+ '}
        {genre}
      </button>
      <button
        type="button"
        onClick={() => onToggle(genre, 'hate')}
        className={`px-2 py-1.5 rounded-sm text-sm border transition-all ${
          state === 'hate'
            ? 'bg-neutral-800 border-neutral-500 text-white'
            : 'border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300 bg-neutral-900/40'
        }`}
        title={`Hate ${genre}`}
      >
        {state === 'hate' ? '✖' : '—'}
      </button>
    </div>
  );
}

function CuratedChip({
  label,
  emoji,
  selected,
  onToggle,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-sm font-semibold border transition-all ${
        selected
          ? 'bg-[#e50914] border-[#e50914] text-white'
          : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/60'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

export default function JoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const prefillName = searchParams.get('name') ?? '';
  const isPassPhone = !!prefillName;

  const [session, setSession] = useState<Session | null>(null);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(prefillName);
  const [mood, setMood] = useState<Mood | null>(null);
  const [genres, setGenres] = useState<Record<string, 'love' | 'hate' | null>>({});
  const [curated, setCurated] = useState<Set<string>>(new Set());
  const [contentType, setContentType] = useState<ContentType>('both');
  const [vibe, setVibe] = useState('');

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(async (r) => {
        if (r.ok) {
          const data: Session = await r.json();
          setSession(data);
          setSessionExists(true);
        } else {
          setSessionExists(false);
        }
      })
      .catch(() => setSessionExists(false));
  }, [sessionId]);

  function toggleGenre(genre: string, action: 'love' | 'hate') {
    setGenres((prev) => {
      const current = prev[genre];
      return { ...prev, [genre]: current === action ? null : action };
    });
  }

  function toggleCurated(label: string) {
    setCurated((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const likedGenres = [
    ...Object.entries(genres)
      .filter(([, v]) => v === 'love')
      .map(([k]) => k),
    ...Array.from(curated),
  ];
  const hatedGenres = Object.entries(genres)
    .filter(([, v]) => v === 'hate')
    .map(([k]) => k);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !mood) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mood, likedGenres, hatedGenres, contentType, vibe }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Submission failed');
      }
    } catch {
      alert('Network error. Try again!');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (sessionExists === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-neutral-400 animate-pulse text-lg">Loading session...</div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────
  if (sessionExists === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-4">
        <div className="text-5xl">😬</div>
        <h2 className="text-2xl font-black text-white">Session not found</h2>
        <p className="text-neutral-400">This link may have expired or is invalid.</p>
        <a href="/" className="btn-primary text-white px-6 py-3 rounded-sm font-bold">
          Create a New Session
        </a>
      </div>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-6 px-4 fade-up">
        <div className="text-7xl animate-bounce">🎉</div>
        <h2 className="text-3xl font-black text-white text-center">You&apos;re in, {name}!</h2>
        <p className="text-neutral-300 text-center max-w-sm">
          Your preferences have been submitted.
          {isPassPhone
            ? ' Pass the phone back to the host!'
            : ' Wait for the host to click Find Our Pick and then check the results!'}
        </p>
        <div className="flex gap-3">
          {isPassPhone ? (
            <a
              href={`/session/${sessionId}`}
              className="btn-primary text-white px-6 py-3 rounded-sm font-bold"
            >
              ← Back to Host Dashboard
            </a>
          ) : (
            <>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMood(null);
                  setGenres({});
                  setCurated(new Set());
                  setVibe('');
                }}
                className="border border-neutral-600 text-neutral-300 px-5 py-2.5 rounded-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                Edit My Preferences
              </button>
              <a
                href={`/results/${sessionId}`}
                className="btn-primary text-white px-5 py-2.5 rounded-sm font-semibold"
              >
                See Results 🎬
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Determine available names (group names not yet submitted) ──────────
  const submittedNamesSet = new Set(
    (session?.submissions ?? []).map((s) => s.name.toLowerCase())
  );
  const availableNames = (session?.groupNames ?? []).filter(
    (n) => !submittedNamesSet.has(n.toLowerCase())
  );

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 py-10 fade-up">
      <div className="text-center mb-8">
        <div className="inline-block mb-3 text-[10px] text-[#e50914] font-bold tracking-[0.2em] uppercase">
          Who&apos;s Watching
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
          {prefillName ? `${prefillName}, what's the vibe?` : 'What are you feeling?'}
        </h1>
        <p className="text-neutral-400 mt-3 text-sm">Be honest — better input, better picks.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-3 text-[11px] uppercase tracking-[0.15em]">
            Your Name
          </label>
          {prefillName ? (
            <div className="w-full bg-black/40 border border-neutral-800 rounded-sm px-4 py-3 text-white font-semibold">
              {prefillName}
            </div>
          ) : availableNames.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {availableNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setName(n)}
                    className={`px-4 py-2 rounded-sm border text-sm font-semibold transition-all ${
                      name === n
                        ? 'border-[#e50914] bg-[#e50914]/20 text-white'
                        : 'border-neutral-700 text-neutral-300 hover:border-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={availableNames.includes(name) ? '' : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Or type a different name..."
                maxLength={40}
                className="w-full bg-black/40 border border-neutral-800 rounded-sm px-4 py-3 text-white placeholder-neutral-600 outline-none focus:border-[#e50914] transition-colors text-sm"
              />
            </div>
          ) : (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Sara, The Picky One..."
              required
              maxLength={40}
              className="w-full bg-black/40 border border-neutral-800 rounded-sm px-4 py-3 text-white placeholder-neutral-600 outline-none focus:border-[#e50914] transition-colors"
            />
          )}
        </div>

        {/* Mood */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-3 text-[11px] uppercase tracking-[0.15em]">
            Tonight&apos;s Mood
          </label>
          <div className="grid grid-cols-4 gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-sm border text-[11px] font-semibold transition-all ${
                  mood === m.value
                    ? 'border-[#e50914] bg-[#e50914]/20 text-white scale-105'
                    : 'border-neutral-800 bg-black/30 text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Curated collections */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-1 text-[11px] uppercase tracking-[0.15em]">
            Collections
          </label>
          <p className="text-neutral-600 text-xs mb-3">Extra flavor for our picker. Click to add.</p>
          <div className="flex flex-wrap gap-2">
            {CURATED_OPTIONS.map((c) => (
              <CuratedChip
                key={c.label}
                label={c.label}
                emoji={c.emoji}
                selected={curated.has(c.label)}
                onToggle={() => toggleCurated(c.label)}
              />
            ))}
          </div>
        </div>

        {/* Genres */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-1 text-[11px] uppercase tracking-[0.15em]">
            Genres
          </label>
          <p className="text-neutral-600 text-xs mb-4">
            Click <span className="text-white font-semibold">+ Genre</span> to love it &nbsp;·&nbsp;
            Click <span className="text-neutral-400 font-semibold">—</span> to veto it
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => (
              <GenreChip
                key={genre}
                genre={genre}
                state={genres[genre] ?? null}
                onToggle={toggleGenre}
              />
            ))}
          </div>
          {(likedGenres.length > 0 || hatedGenres.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
              {likedGenres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-1 bg-[#e50914]/15 border border-[#e50914]/50 text-[#ff5b61] rounded-sm font-semibold"
                >
                  ❤ {g}
                </span>
              ))}
              {hatedGenres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-neutral-500 rounded-sm font-semibold line-through"
                >
                  ✖ {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Type */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-3 text-[11px] uppercase tracking-[0.15em]">
            Movie or Series?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'movie', label: 'Movie', emoji: '🎥' },
                { value: 'show', label: 'Series', emoji: '📺' },
                { value: 'both', label: 'Either', emoji: '🎞️' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContentType(opt.value)}
                className={`flex flex-col items-center gap-1 py-4 rounded-sm border font-semibold text-sm transition-all ${
                  contentType === opt.value
                    ? 'border-[#e50914] bg-[#e50914]/20 text-white scale-105'
                    : 'border-neutral-800 bg-black/30 text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe note */}
        <div className="nf-card rounded-sm p-5">
          <label className="block text-neutral-400 font-bold mb-1 text-[11px] uppercase tracking-[0.15em]">
            Vibe Note <span className="text-neutral-600 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <p className="text-neutral-600 text-xs mb-3">
            e.g. &quot;nothing too long&quot;, &quot;need a good cry&quot;, &quot;kids in the room&quot;
          </p>
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Tell us anything extra..."
            maxLength={200}
            rows={3}
            className="w-full bg-black/40 border border-neutral-800 rounded-sm px-4 py-3 text-white placeholder-neutral-600 outline-none focus:border-[#e50914] transition-colors resize-none"
          />
          <div className="text-right text-neutral-600 text-xs mt-1">{vibe.length}/200</div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !name.trim() || !mood}
          className="w-full btn-primary text-white font-black text-lg py-4 rounded-sm"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : (
            '▶  Submit My Vibe'
          )}
        </button>
      </form>
    </div>
  );
}
