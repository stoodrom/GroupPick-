import { NextResponse } from 'next/server';
import { getSession, updateGroupNames } from '@/lib/kv';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { groupNames } = body;

  if (!Array.isArray(groupNames) || groupNames.length === 0) {
    return NextResponse.json({ error: 'groupNames must be a non-empty array' }, { status: 400 });
  }

  const names = groupNames.map((n: string) => String(n).trim()).filter(Boolean);
  if (names.length === 0) {
    return NextResponse.json({ error: 'At least one valid name is required' }, { status: 400 });
  }

  const session = await updateGroupNames(params.id, names);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}
