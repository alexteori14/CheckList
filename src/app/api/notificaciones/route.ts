import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { enviarCorreoPrueba, mailConfigurado, procesarEncuestasVencidas } from '@/lib/notifier';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    configurado: mailConfigurado(),
    notificaciones: (db.notificaciones || []).slice(0, 50),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.accion === 'prueba') {
      const r = await enviarCorreoPrueba(String(body.numeroEmpleado || ''));
      return NextResponse.json(r, { status: r.ok ? 200 : 422 });
    }
    const r = await procesarEncuestasVencidas();
    return NextResponse.json({ ok: true, ...r, configurado: mailConfigurado() });
  } catch (error) {
    console.error('Error en notificaciones:', error);
    return NextResponse.json({ error: 'Error al procesar notificaciones.' }, { status: 500 });
  }
}
