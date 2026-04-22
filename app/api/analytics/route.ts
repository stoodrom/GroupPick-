import { NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/kv';

export async function GET() {
  return NextResponse.json(getAnalytics());
}
