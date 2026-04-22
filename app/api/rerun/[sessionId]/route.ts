import { NextResponse } from 'next/server';
import { unresolveSession } from '@/lib/kv';

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await unresolveSession(params.sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
