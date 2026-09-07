import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { dashboardStatus } from '@/lib/status';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Não autorizado', { status: 403 });
  }
  return NextResponse.json(dashboardStatus());
}
