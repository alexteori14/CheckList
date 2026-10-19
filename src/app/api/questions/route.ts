import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, registerAudit } from '@/lib/db';
import { Criticidad, Pregunta } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = readDb();
  const { searchParams } = new URL(req.url);
  const areaId = searchParams.get('areaId');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  let list = db.preguntas;
  if (areaId) {
    list = list.filter((p) => p.areaId === Number(areaId));
  }
  if (!includeInactive) {
    list = list.filter((p) => p.activo);
  }
  list = [...list].sort((a, b) => a.areaId - b.areaId || a.orden - b.orden);

  return NextResponse.json({ preguntas: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      areaId,
      categoria,
      texto,
      descripcionAyuda,
      sugerenciasMotivoNo,
      criticidad,
    } = body;

    if (!areaId || !texto || !String(texto).trim()) {
      return NextResponse.json(
        { error: 'Área y texto de la pregunta son obligatorios.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const area = db.areas.find((a) => a.id === Number(areaId));
    if (!area) {
      return NextResponse.json({ error: 'Área no encontrada.' }, { status: 404 });
    }

    const areaQuestions = db.preguntas.filter((p) => p.areaId === area.id);
    const nextOrder = areaQuestions.length + 1;
    const maxId = db.preguntas.reduce((max, p) => Math.max(max, p.id), 100);
    const codigo = `${area.codigo}-${String(nextOrder).padStart(2, '0')}`;

    const newQuestion: Pregunta = {
      id: maxId + 1,
      areaId: area.id,
      codigo,
      categoria: categoria ? String(categoria).trim() : 'Inspección Operativa',
      texto: String(texto).trim(),
      descripcionAyuda: descripcionAyuda
        ? String(descripcionAyuda).trim()
        : 'Verifique visualmente el punto e indique Sí o No.',
      sugerenciasMotivoNo: Array.isArray(sugerenciasMotivoNo) && sugerenciasMotivoNo.length > 0
        ? sugerenciasMotivoNo
        : ['Incumplimiento detectado en revisión', 'Requiere intervención técnica'],
      orden: nextOrder,
      criticidad: (criticidad as Criticidad) || 'MEDIA',
      activo: true,
    };

    db.preguntas.push(newQuestion);

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'CHECKLIST_ADMIN',
      accion: 'CREAR_PREGUNTA',
      entidad: 'Pregunta',
      entidadId: String(newQuestion.id),
      detalles: `Pregunta ${newQuestion.codigo} agregada al área ${area.nombre}`,
    });

    writeDb(db);
    return NextResponse.json({ pregunta: newQuestion }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Error al crear la pregunta.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, texto, categoria, descripcionAyuda, criticidad, activo } = body;

    const db = readDb();
    const idx = db.preguntas.findIndex((p) => p.id === Number(id));
    if (idx === -1) {
      return NextResponse.json({ error: 'Pregunta no encontrada.' }, { status: 404 });
    }

    const q = db.preguntas[idx];
    if (texto !== undefined) q.texto = String(texto).trim();
    if (categoria !== undefined) q.categoria = String(categoria).trim();
    if (descripcionAyuda !== undefined) q.descripcionAyuda = String(descripcionAyuda).trim();
    if (criticidad !== undefined) q.criticidad = criticidad as Criticidad;
    if (typeof activo === 'boolean') q.activo = activo;

    db.preguntas[idx] = q;

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'CHECKLIST_ADMIN',
      accion: 'ACTUALIZAR_PREGUNTA',
      entidad: 'Pregunta',
      entidadId: String(q.id),
      detalles: `Pregunta ${q.codigo} actualizada (Activo: ${q.activo})`,
    });

    writeDb(db);
    return NextResponse.json({ pregunta: q });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Error al actualizar la pregunta.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let idParam = searchParams.get('id');

    if (!idParam) {
      const body = await req.json().catch(() => ({}));
      idParam = body.id ? String(body.id) : null;
    }

    if (!idParam) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la pregunta a eliminar.' },
        { status: 400 }
      );
    }

    const questionId = Number(idParam);
    const db = readDb();
    const idx = db.preguntas.findIndex((p) => p.id === questionId);

    if (idx === -1) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada.' },
        { status: 404 }
      );
    }

    const removed = db.preguntas[idx];
    db.preguntas.splice(idx, 1);

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'CHECKLIST_ADMIN',
      accion: 'ELIMINAR_PREGUNTA',
      entidad: 'Pregunta',
      entidadId: String(questionId),
      detalles: `Pregunta ${removed.codigo} ("${removed.texto}") eliminada permanentemente.`,
    });

    writeDb(db);
    return NextResponse.json({ ok: true, preguntaEliminada: removed });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la pregunta.' },
      { status: 500 }
    );
  }
}
