import { NextResponse } from 'next/server';
import { addSubmission, getSession } from '@/lib/kv';
import type { Submission } from '@/lib/types';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.resolved) {
    return NextResponse.json({ error: 'Session already resolved' }, { status: 400 });
  }

  const body = await req.json();
  const { name, mood, likedGenres, hatedGenres, contentType, vibe } = body;

  if (!name?.trim() || !mood || !contentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const submission: Submission = {
    name: name.trim(),
    mood,
    likedGenres: likedGenres ?? [],
    hatedGenres: hatedGenres ?? [],
    contentType,
    vibe: vibe ?? '',
    submittedAt: Date.now(),
  };

  const updated = await addSubmission(params.id, submission);
  return NextResponse.json({ success: true, count: updated?.submissions.length ?? 0 });
}
