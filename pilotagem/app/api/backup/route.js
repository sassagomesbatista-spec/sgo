import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import db, { BACKUP_DIR } from '@/lib/db';
import { getSession } from '@/lib/auth';

const SAFE_FILENAME = /^pilotagem-\d{4}-\d{2}-\d{2}\.db$/;

export async function GET(request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const file = request.nextUrl.searchParams.get('file');

  if (file) {
    if (!SAFE_FILENAME.test(file)) {
      return new NextResponse('Arquivo inválido', { status: 400 });
    }
    const filePath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Backup não encontrado', { status: 404 });
    }
    return new NextResponse(fs.readFileSync(filePath), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file}"`,
      },
    });
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
