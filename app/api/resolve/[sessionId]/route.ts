import { NextResponse } from 'next/server';
import { getSession, saveResult, recordResolution } from '@/lib/kv';
import { resolveGroupPick } from '@/lib/claude';
import { searchTMDB } from '@/lib/tmdb';
import type { Pick, ResolveResult } from '@/lib/types';

async function enrichWithPoster(pick: Pick): Promise<Pick> {
  const tmdb = await searchTMDB(pick.title, pick.type, pick.year);
  if (tmdb) {
    return {
      ...pick,
      tmdbId: tmdb.tmdbId,
      posterPath: tmdb.posterPath ?? undefined,
      trailerUrl: tmdb.trailerUrl ?? undefined,
    };
  }
  return pick;
}

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession(params.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.resolved && session.result) {
      return NextResponse.json(session.result);
    }
    if (session.submissions.length === 0) {
      return NextResponse.json({ error: 'No submissions yet' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('your_')) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not set. Add it to .env.local and restart the dev server.' },
        { status: 500 }
      );
    }

    const result = await resolveGroupPick(session.submissions);

    // Enrich all picks with TMDB poster + trailer data in parallel
    const allPicks = [result.topPick, ...result.runnerUps];
    const enrichedPicks = await Promise.all(allPicks.map(enrichWithPoster));

    const enriched: ResolveResult = {
      topPick: enrichedPicks[0],
      runnerUps: enrichedPicks.slice(1),
      resolvedAt: Date.now(),
    };

    await saveResult(params.sessionId, enriched);

    // Track analytics
    recordResolution(session);

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[resolve] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
