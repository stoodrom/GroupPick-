import { Redis } from '@upstash/redis';
import type { Session, Submission, ResolveResult } from '@/lib/types';

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
