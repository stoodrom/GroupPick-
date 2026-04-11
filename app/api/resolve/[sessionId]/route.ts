import { NextResponse } from 'next/server';
import { getSession, saveResult } from '@/lib/kv';
import { resolveGroupPick } from '@/lib/claude';
import { searchTMDB } from '@/lib/tmdb';
import type { Pick, ResolveResult } from '@/lib/types';

async function enrichWithPoster(pick: Pick): Promise<Pick> {
  const tmdb = await searchTMDB(pick.title, pick.type, pick.year);
  if (tmdb) {
    return { ...pick, tmdbId: tmdb.tmdbId, posterPath: tmdb.posterPath ?? undefined };
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

    // Enrich all picks with TMDB poster data in parallel
    const [topPick, runner0, runner1] = await Promise.all([
      enrichWithPoster(result.topPick),
      enrichWithPoster(result.runnerUps[0]),
      enrichWithPoster(result.runnerUps[1]),
    ]);

    const enriched: ResolveResult = {
      ...result,
      topPick,
      runnerUps: [runner0, runner1] as [Pick, Pick],
      resolvedAt: Date.now(),
    };

    await saveResult(params.sessionId, enriched);
    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[resolve] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
