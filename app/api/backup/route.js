import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const tmpPath = path.join(os.tmpdir(), `pilotagem-backup-${Date.now()}.db`);
  await db.backup(tmpPath);
  const fileBuffer = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);

  const dataStr = new Date().toISOString().slice(0, 10);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="pilotagem-backup-${dataStr}.db"`,
    },
  });
}
