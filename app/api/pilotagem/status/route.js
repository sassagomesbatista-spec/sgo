import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pilotistaStatus } from '@/lib/status';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'pilotista' || !session.pilotista_id) {
    return new NextResponse('Não autorizado', { status: 403 });
  }
  return NextResponse.json(pilotistaStatus(session.pilotista_id));
}
