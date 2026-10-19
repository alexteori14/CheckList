import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, registerAudit } from '@/lib/db';
import { Area, Pregunta } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    areas: db.areas,
    preguntasPorArea: db.areas.map((a) => ({
      ...a,
      totalPreguntas: db.preguntas.filter((p) => p.areaId === a.id && p.activo).length,
      totalEmpleados: db.empleados.filter((e) => e.areaId === a.id && e.activo).length,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, descripcion, colorHex } = body;

    if (!nombre || !String(nombre).trim()) {
      return NextResponse.json(
        { error: 'El nombre del área es obligatorio.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const cleanName = String(nombre).trim();

    if (db.areas.some((a) => a.nombre.toLowerCase() === cleanName.toLowerCase())) {
      return NextResponse.json(
        { error: 'Ya existe un área con ese nombre.' },
        { status: 409 }
      );
    }

    const nextId = db.areas.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    const autoCode = cleanName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || `AR${nextId}`;

    const newArea: Area = {
      id: nextId,
      codigo: autoCode,
      nombre: cleanName,
      descripcion: descripcion
        ? String(descripcion).trim()
        : `Supervisión operativa del área de ${cleanName}.`,
      colorHex: colorHex || '#2563EB',
      icono: 'Building2',
      responsable: '',
      activo: true,
      createdAt: new Date().toISOString(),
    };

    db.areas.push(newArea);

    const maxQuestionId = db.preguntas.reduce((max, p) => Math.max(max, p.id), 400);
    const defaultQuestions: Pregunta[] = [
      {
        id: maxQuestionId + 1,
        areaId: newArea.id,
        codigo: `${autoCode}-01`,
        categoria: 'Condiciones Operativas',
        texto: `¿Los equipos y estaciones de trabajo de ${cleanName} se encuentran operativos y sin alertas?`,
        descripcionAyuda: 'Verificar estado general al inicio de turno.',
        sugerenciasMotivoNo: ['Equipo principal fuera de servicio', 'Indicador de falla encendido'],
        orden: 1,
        criticidad: 'ALTA',
        activo: true,
      },
      {
        id: maxQuestionId + 2,
        areaId: newArea.id,
        codigo: `${autoCode}-02`,
        categoria: 'Seguridad y Normativa',
        texto: `¿Se cumplen todas las medidas de seguridad, señalización y EPP requeridos en ${cleanName}?`,
        descripcionAyuda: 'Validar extintores, rutas de evacuación y uso correcto de EPP.',
        sugerenciasMotivoNo: ['Falta señalización preventiva', 'Extintor obstruido', 'EPP incompleto'],
        orden: 2,
        criticidad: 'CRITICA',
        activo: true,
      },
      {
        id: maxQuestionId + 3,
        areaId: newArea.id,
        codigo: `${autoCode}-03`,
        categoria: 'Orden y Limpieza 5S',
        texto: `¿El área de ${cleanName} se encuentra limpia, ordenada y con su bitácora actualizada?`,
        descripcionAyuda: 'Confirmar ausencia de materiales innecesarios en pasillos.',
        sugerenciasMotivoNo: ['Pasillo con material en tránsito', 'Bitácora pendiente de firma'],
        orden: 3,
        criticidad: 'MEDIA',
        activo: true,
      },
    ];

    db.preguntas.push(...defaultQuestions);

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'AREAS',
      accion: 'CREAR_AREA',
      entidad: 'Area',
      entidadId: String(newArea.id),
      detalles: `Nueva área creada: ${newArea.nombre} con ${defaultQuestions.length} preguntas iniciales.`,
    });

    writeDb(db);

    return NextResponse.json({ area: newArea, preguntasCreadas: defaultQuestions }, { status: 201 });
  } catch (error) {
    console.error('Error creating area:', error);
    return NextResponse.json({ error: 'Error al crear la nueva área.' }, { status: 500 });
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
        { error: 'Se requiere el ID del área a eliminar.' },
        { status: 400 }
      );
    }

    const areaId = Number(idParam);
    const db = readDb();

    if (db.areas.length <= 1) {
      return NextResponse.json(
        { error: 'Debe existir al menos un área activa en el sistema.' },
        { status: 400 }
      );
    }

    const areaIndex = db.areas.findIndex((a) => a.id === areaId);
    if (areaIndex === -1) {
      return NextResponse.json(
        { error: 'Área no encontrada.' },
        { status: 404 }
      );
    }

    const removedArea = db.areas[areaIndex];
    db.areas.splice(areaIndex, 1);

    // Eliminar preguntas asociadas al área eliminada
    const removedQuestionsCount = db.preguntas.filter((p) => p.areaId === areaId).length;
    db.preguntas = db.preguntas.filter((p) => p.areaId !== areaId);

    // Reasignar empleados que estaban en esa área a la primera área disponible
    const fallbackArea = db.areas[0];
    if (fallbackArea) {
      db.empleados.forEach((emp) => {
        if (emp.areaId === areaId) {
          emp.areaId = fallbackArea.id;
          emp.areaNombre = fallbackArea.nombre;
        }
      });
    }

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'AREAS',
      accion: 'ELIMINAR_AREA',
      entidad: 'Area',
      entidadId: String(areaId),
      detalles: `Área "${removedArea.nombre}" eliminada junto con ${removedQuestionsCount} pregunta(s) asociada(s).`,
    });

    writeDb(db);

    return NextResponse.json({
      ok: true,
      areaEliminada: removedArea.nombre,
    });
  } catch (error) {
    console.error('Error deleting area:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el área.' },
      { status: 500 }
    );
  }
}
