import { NextResponse } from 'next/server';
import { createSession } from '@/lib/kv';

export async function POST() {
  const { nanoid } = await import('nanoid');
  const id = nanoid(10);
  const session = await createSession(id);
  return NextResponse.json({ id: session.id });
}
