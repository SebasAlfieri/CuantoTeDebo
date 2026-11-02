import { NextResponse } from 'next/server';

import { getAdminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { cleanupInactiveRooms } from '@/lib/room-cleanup';

// Lo llama Vercel Cron una vez por día (ver vercel.json) con "Authorization: Bearer CRON_SECRET".
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await cleanupInactiveRooms(getAdminDb());
    return NextResponse.json(result);
  } catch (err) {
    logger.error('Falló la limpieza de salas', err);
    // La respuesta solo la ve quien tiene el secreto; queda en el registro del cron de Vercel.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Falló la limpieza de salas', message }, { status: 500 });
  }
};
