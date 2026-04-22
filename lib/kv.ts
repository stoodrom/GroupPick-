import { Redis } from '@upstash/redis';
import type { Session, Submission, ResolveResult, Analytics } from '@/lib/types';

// ---------------------------------------------------------------------------
// Redis client — cached singleton, null when env vars are absent
// ---------------------------------------------------------------------------
let _redis: Redis | null | undefined; // undefined = not initialised yet

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    _redis = null;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[kv] No Redis env vars — using in-memory store. Sessions won\'t persist across restarts.');
    }
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// In-memory fallback for local development
// Stored on globalThis so it survives Next.js HMR (hot module reload).
// Without this, saving any file wipes all sessions.
// ---------------------------------------------------------------------------
const globalForKV = globalThis as unknown as { __grouppickMemStore?: Map<string, Session> };
const memStore: Map<string, Session> =
  globalForKV.__grouppickMemStore ?? new Map<string, Session>();
if (process.env.NODE_ENV !== 'production') {
  globalForKV.__grouppickMemStore = memStore;
}

// TTL: 24 hours (seconds)
const TTL = 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function setSession(id: string, session: Session) {
  const redis = getRedis();
  if (redis) {
    await redis.set(`session:${id}`, session, { ex: TTL });
  } else {
    memStore.set(`session:${id}`, session);
  }
}

async function fetchSession(id: string): Promise<Session | null> {
  const redis = getRedis();
  if (redis) {
    return redis.get<Session>(`session:${id}`);
  }
  return memStore.get(`session:${id}`) ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function createSession(id: string): Promise<Session> {
  const session: Session = {
    id,
    createdAt: Date.now(),
    resolved: false,
    groupNames: [],
    submissions: [],
  };
  await setSession(id, session);
  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  return fetchSession(id);
}

export async function updateGroupNames(id: string, names: string[]): Promise<Session | null> {
  const session = await fetchSession(id);
  if (!session) return null;
  session.groupNames = names;
  await setSession(id, session);
  return session;
}

export async function addSubmission(id: string, submission: Submission): Promise<Session | null> {
  const session = await fetchSession(id);
  if (!session) return null;
  if (session.resolved) return session;

  const existing = session.submissions.findIndex(
    (s) => s.name.toLowerCase() === submission.name.toLowerCase()
  );
  if (existing >= 0) {
    session.submissions[existing] = submission;
  } else {
    session.submissions.push(submission);
  }

  await setSession(id, session);
  return session;
}

export async function saveResult(id: string, result: ResolveResult): Promise<Session | null> {
  const session = await fetchSession(id);
  if (!session) return null;
  session.resolved = true;
  session.result = result;
  await setSession(id, session);
  return session;
}

export async function unresolveSession(id: string): Promise<Session | null> {
  const session = await fetchSession(id);
  if (!session) return null;
  session.resolved = false;
  session.result = undefined;
  await setSession(id, session);
  return session;
}

// ---------------------------------------------------------------------------
// Analytics — lightweight in-memory tracking
// ---------------------------------------------------------------------------
interface AnalyticsEvent {
  groupSize: number;
  moods: string[];
  genres: string[];
  timeToResolveMs: number;
}

const globalForAnalytics = globalThis as unknown as { __grouppickAnalytics?: AnalyticsEvent[] };
const analyticsStore: AnalyticsEvent[] = globalForAnalytics.__grouppickAnalytics ?? [];
if (process.env.NODE_ENV !== 'production') {
  globalForAnalytics.__grouppickAnalytics = analyticsStore;
}

export function recordResolution(session: Session) {
  analyticsStore.push({
    groupSize: session.submissions.length,
    moods: session.submissions.map((s) => s.mood),
    genres: session.submissions.flatMap((s) => s.likedGenres),
    timeToResolveMs: Date.now() - session.createdAt,
  });
}

export function getAnalytics(): Analytics {
  const totalSessions = memStore.size;
  const totalResolutions = analyticsStore.length;

  if (totalResolutions === 0) {
    return {
      totalSessions,
      totalResolutions: 0,
      avgGroupSize: 0,
      topMoods: {},
      topGenres: {},
      resolutionRate: 0,
      avgTimeToResolveMs: 0,
    };
  }

  const avgGroupSize =
    analyticsStore.reduce((sum, e) => sum + e.groupSize, 0) / totalResolutions;

  const moodCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  let totalTime = 0;

  for (const event of analyticsStore) {
    totalTime += event.timeToResolveMs;
    for (const mood of event.moods) {
      moodCounts[mood] = (moodCounts[mood] ?? 0) + 1;
    }
    for (const genre of event.genres) {
      genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
    }
  }

  return {
    totalSessions,
    totalResolutions,
    avgGroupSize: Math.round(avgGroupSize * 10) / 10,
    topMoods: moodCounts,
    topGenres: genreCounts,
    resolutionRate: totalSessions > 0 ? Math.round((totalResolutions / totalSessions) * 100) : 0,
    avgTimeToResolveMs: Math.round(totalTime / totalResolutions),
  };
}
