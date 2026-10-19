import { NextRequest, NextResponse } from 'next/server';
import { getLocalISODate, readDb, registerAudit, writeDb } from '@/lib/db';
import {
  CaptureOrigin,
  ChecklistRecord,
  Evidencia,
  ImageFormat,
  RespuestaItem,
} from '@/types';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_FORMATS: ImageFormat[] = ['JPG', 'PNG', 'WEBP'];

function calcStatsForSubset(subset: ChecklistRecord[]) {
  const totalChecklists = subset.length;
  const totalRespuestas = subset.reduce((acc, c) => acc + c.totalPreguntas, 0);
  const totalSi = subset.reduce((acc, c) => acc + c.totalSi, 0);
  const totalNo = subset.reduce((acc, c) => acc + c.totalNo, 0);
  const cumplimientoGeneral =
    totalRespuestas > 0 ? Number(((totalSi / totalRespuestas) * 100).toFixed(1)) : 100;
  const porcentajeIncidencias =
    totalRespuestas > 0 ? Number(((totalNo / totalRespuestas) * 100).toFixed(1)) : 0;

  return {
    totalChecklists,
    totalRespuestas,
    totalSi,
    totalNo,
    cumplimientoGeneral,
    porcentajeIncidencias,
  };
}

export async function GET(req: NextRequest) {
  const db = readDb();
  const { searchParams } = new URL(req.url);

  const periodo = searchParams.get('periodo') || 'todos';
  const fechaInicio = searchParams.get('fechaInicio') || '';
  const fechaFin = searchParams.get('fechaFin') || '';
  const areaId = searchParams.get('areaId') || '';
  const empleadoId = searchParams.get('empleadoId') || '';

  const today = getLocalISODate(0);
  const weekAgo = getLocalISODate(-6);
  const monthAgo = getLocalISODate(-29);

  let filtered = [...db.checklists];

  if (periodo === 'dia') {
    const targetDay = fechaInicio || today;
    filtered = filtered.filter((c) => c.fechaOperacion === targetDay);
  } else if (periodo === 'semana') {
    filtered = filtered.filter((c) => c.fechaOperacion >= weekAgo && c.fechaOperacion <= today);
  } else if (periodo === 'mes') {
    filtered = filtered.filter((c) => c.fechaOperacion >= monthAgo && c.fechaOperacion <= today);
  } else if (periodo === 'rango') {
    if (fechaInicio) {
      filtered = filtered.filter((c) => c.fechaOperacion >= fechaInicio);
    }
    if (fechaFin) {
      filtered = filtered.filter((c) => c.fechaOperacion <= fechaFin);
    }
  }

  if (areaId && areaId !== 'todas') {
    filtered = filtered.filter((c) => c.areaId === Number(areaId));
  }

  if (empleadoId && empleadoId !== 'todos') {
    filtered = filtered.filter(
      (c) => c.empleadoId === empleadoId || c.numeroEmpleado === empleadoId
    );
  }

  filtered.sort((a, b) => b.fechaOperacion.localeCompare(a.fechaOperacion) || b.createdAt.localeCompare(a.createdAt));

  const kpisFiltro = calcStatsForSubset(filtered);

  const checklistsHoy = db.checklists.filter((c) => c.fechaOperacion === today);
  const statsHoy = calcStatsForSubset(checklistsHoy);

  const incidenciasPorAreaHoy = db.areas.map((a) => {
    const delAreaHoy = checklistsHoy.filter((c) => c.areaId === a.id);
    const totalNo = delAreaHoy.reduce((sum, c) => sum + c.totalNo, 0);
    return { areaId: a.id, areaNombre: a.nombre, incidencias: totalNo };
  });
  incidenciasPorAreaHoy.sort((a, b) => b.incidencias - a.incidencias);
  const areaMasIncidenciasHoy =
    incidenciasPorAreaHoy[0] && incidenciasPorAreaHoy[0].incidencias > 0
      ? `${incidenciasPorAreaHoy[0].areaNombre} (${incidenciasPorAreaHoy[0].incidencias})`
      : 'Sin incidencias hoy';

  const checklistsSemana = db.checklists.filter(
    (c) => c.fechaOperacion >= weekAgo && c.fechaOperacion <= today
  );
  const statsSemana = calcStatsForSubset(checklistsSemana);

  const tendenciaSemanal: Array<{
    fecha: string;
    etiqueta: string;
    cumplimiento: number;
    incidencias: number;
    checklists: number;
    respuestasSi: number;
    respuestasNo: number;
  }> = [];

  for (let i = -6; i <= 0; i++) {
    const dStr = getLocalISODate(i);
    const dayChecks = db.checklists.filter((c) => c.fechaOperacion === dStr);
    const st = calcStatsForSubset(dayChecks);
    const [, m, d] = dStr.split('-');
    tendenciaSemanal.push({
      fecha: dStr,
      etiqueta: `${d}/${m}`,
      cumplimiento: st.totalChecklists > 0 ? st.cumplimientoGeneral : 100,
      incidencias: st.totalNo,
      checklists: st.totalChecklists,
      respuestasSi: st.totalSi,
      respuestasNo: st.totalNo,
    });
  }

  const checklistsMes = db.checklists.filter(
    (c) => c.fechaOperacion >= monthAgo && c.fechaOperacion <= today
  );
  const statsMes = calcStatsForSubset(checklistsMes);

  const monthMap = new Map<string, ChecklistRecord[]>();
  db.checklists.forEach((c) => {
    const ym = c.fechaOperacion.slice(0, 7);
    if (!monthMap.has(ym)) monthMap.set(ym, []);
    monthMap.get(ym)!.push(c);
  });

  const evolucionMensual = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, list]) => {
      const st = calcStatsForSubset(list);
      return {
        mes: ym,
        cumplimiento: st.cumplimientoGeneral,
        porcentajeIncidencias: st.porcentajeIncidencias,
        totalChecklists: st.totalChecklists,
        totalSi: st.totalSi,
        totalNo: st.totalNo,
      };
    });

  const cumplimientoPorArea = db.areas.map((area) => {
    const areaChecks = filtered.filter((c) => c.areaId === area.id);
    const st = calcStatsForSubset(areaChecks);
    return {
      areaId: area.id,
      codigo: area.codigo,
      areaNombre: area.nombre,
      colorHex: area.colorHex,
      responsable: area.responsable,
      ...st,
    };
  });

  const rankingAreasMensual = [...cumplimientoPorArea].sort(
    (a, b) => b.cumplimientoGeneral - a.cumplimientoGeneral
  );

  const cumplimientoPorUsuario = db.empleados
    .map((emp) => {
      const empChecks = filtered.filter((c) => c.empleadoId === emp.id || c.numeroEmpleado === emp.numeroEmpleado);
      const st = calcStatsForSubset(empChecks);
      return {
        empleadoId: emp.id,
        numeroEmpleado: emp.numeroEmpleado,
        nombreCompleto: emp.nombreCompleto,
        areaNombre: emp.areaNombre,
        rolCodigo: emp.rolCodigo,
        activo: emp.activo,
        ...st,
      };
    })
    .filter((u) => u.totalChecklists > 0)
    .sort((a, b) => b.cumplimientoGeneral - a.cumplimientoGeneral || b.totalChecklists - a.totalChecklists);

  const incidenciasDetectadas = filtered.flatMap((chk) =>
    chk.respuestas
      .filter((r) => !r.respuesta)
      .map((r) => ({
        respuestaId: r.id,
        checklistId: chk.id,
        folio: chk.folio,
        fechaOperacion: chk.fechaOperacion,
        numeroEmpleado: chk.numeroEmpleado,
        nombreEmpleado: chk.nombreEmpleado,
        areaId: chk.areaId,
        areaNombre: chk.areaNombre,
        preguntaCodigo: r.preguntaCodigo,
        preguntaTexto: r.preguntaTexto,
        categoria: r.categoria,
        criticidad: r.criticidad,
        motivoNo: r.motivoNo || 'Sin motivo especificado',
        estadoIncidencia: r.estadoIncidencia,
        evidencia: r.evidencia || null,
        respondidoEn: r.respondidoEn,
      }))
  );

  return NextResponse.json({
    checklists: filtered,
    kpis: kpisFiltro,
    estadisticasDiarias: {
      fecha: today,
      ...statsHoy,
      areaMasIncidencias: areaMasIncidenciasHoy,
    },
    estadisticasSemanales: {
      fechaInicio: weekAgo,
      fechaFin: today,
      ...statsSemana,
      tendenciaSemanal,
    },
    estadisticasMensuales: {
      fechaInicio: monthAgo,
      fechaFin: today,
      ...statsMes,
      evolucionMensual,
      rankingAreas: rankingAreasMensual,
    },
    cumplimientoPorArea,
    cumplimientoPorUsuario,
    incidenciasDetectadas,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      numeroEmpleado,
      fechaOperacion,
      respuestas,
      duracionSegundos,
      dispositivo,
      observacionesGenerales,
    } = body;

    if (!numeroEmpleado) {
      return NextResponse.json(
        { error: 'El número de empleado es obligatorio.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const cleanNum = String(numeroEmpleado).trim().replace(/^EMP-/i, '');
    const empleado = db.empleados.find(
      (e) =>
        (e.numeroEmpleado.toLowerCase() === cleanNum.toLowerCase() ||
          e.numeroEmpleado.toLowerCase() === String(numeroEmpleado).trim().toLowerCase()) &&
        e.activo
    );

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o inactivo en el sistema.' },
        { status: 404 }
      );
    }

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return NextResponse.json(
        { error: 'Debe responder las preguntas del checklist.' },
        { status: 400 }
      );
    }

    for (const item of respuestas) {
      if (item.respuesta === false) {
        const motivo = item.motivoNo ? String(item.motivoNo).trim() : '';
        if (!motivo) {
          return NextResponse.json(
            {
              error: `Regla de validación: La pregunta "${item.preguntaCodigo || item.preguntaId}" fue respondida con "No", por lo que el motivo o explicación es OBLIGATORIO.`,
            },
            { status: 400 }
          );
        }
      }

      if (item.evidencia && item.evidencia.formato) {
        const fmt = String(item.evidencia.formato).toUpperCase().replace('JPEG', 'JPG') as ImageFormat;
        if (!ALLOWED_IMAGE_FORMATS.includes(fmt)) {
          return NextResponse.json(
            {
              error: `Formato de imagen no permitido (${item.evidencia.formato}). Solo se aceptan JPG, PNG y WEBP.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    const targetDate = fechaOperacion || getLocalISODate(0);
    const checklistId = `chk-${Date.now()}`;
    const folio = `CHK-${targetDate.replace(/-/g, '')}-${String(db.checklists.length + 1).padStart(3, '0')}`;

    const nuevasEvidencias: Evidencia[] = [];

    const respuestasProcesadas: RespuestaItem[] = respuestas.map((item: {
      preguntaId: number;
      respuesta: boolean;
      motivoNo?: string;
      evidencia?: {
        nombreArchivo: string;
        formato: string;
        mimeType: string;
        tamanoBytes: number;
        dataUrl: string;
        origenCaptura?: CaptureOrigin;
      };
    }) => {
      const preg = db.preguntas.find((p) => p.id === Number(item.preguntaId));
      const respuestaId = `resp-${checklistId}-${item.preguntaId}`;
      let evidObj: Evidencia | undefined;

      if (!item.respuesta && item.evidencia && item.evidencia.dataUrl) {
        const fmt = (String(item.evidencia.formato || 'PNG')
          .toUpperCase()
          .replace('JPEG', 'JPG') as ImageFormat);
        evidObj = {
          id: `evid-${respuestaId}`,
          respuestaId,
          checklistId,
          nombreArchivo: item.evidencia.nombreArchivo || `evidencia_${item.preguntaId}.${fmt.toLowerCase()}`,
          formato: ALLOWED_IMAGE_FORMATS.includes(fmt) ? fmt : 'PNG',
          mimeType: item.evidencia.mimeType || 'image/png',
          tamanoBytes: Number(item.evidencia.tamanoBytes || 0),
          dataUrl: item.evidencia.dataUrl,
          origenCaptura: item.evidencia.origenCaptura || 'GALERIA',
          createdAt: nowIso,
        };
        nuevasEvidencias.push(evidObj);
      }

      return {
        id: respuestaId,
        checklistId,
        preguntaId: Number(item.preguntaId),
        preguntaCodigo: preg?.codigo || `P-${item.preguntaId}`,
        preguntaTexto: preg?.texto || 'Pregunta de inspección',
        categoria: preg?.categoria || 'General',
        criticidad: preg?.criticidad || 'MEDIA',
        respuesta: Boolean(item.respuesta),
        motivoNo: !item.respuesta ? String(item.motivoNo).trim() : undefined,
        evidencia: evidObj,
        estadoIncidencia: !item.respuesta ? 'ABIERTA' : 'N/A',
        respondidoEn: nowIso,
      };
    });

    const totalPreguntas = respuestasProcesadas.length;
    const totalSi = respuestasProcesadas.filter((r) => r.respuesta).length;
    const totalNo = totalPreguntas - totalSi;
    const porcentajeCumplimiento = Number(((totalSi / totalPreguntas) * 100).toFixed(2));
    const porcentajeIncidencias = Number(((totalNo / totalPreguntas) * 100).toFixed(2));

    const nuevoChecklist: ChecklistRecord = {
      id: checklistId,
      folio,
      empleadoId: empleado.id,
      numeroEmpleado: empleado.numeroEmpleado,
      nombreEmpleado: empleado.nombreCompleto,
      areaId: empleado.areaId,
      areaNombre: empleado.areaNombre,
      fechaOperacion: targetDate,
      totalPreguntas,
      totalSi,
      totalNo,
      porcentajeCumplimiento,
      porcentajeIncidencias,
      duracionSegundos: Number(duracionSegundos || 45),
      dispositivo: dispositivo || 'Web App Responsive',
      observacionesGenerales:
        observacionesGenerales ||
        (totalNo > 0
          ? `Checklist registrado con ${totalNo} incidencia(s) documentada(s).`
          : 'Checklist completado con 100% de cumplimiento.'),
      respuestas: respuestasProcesadas,
      createdAt: nowIso,
    };

    db.checklists.unshift(nuevoChecklist);
    db.evidencias.unshift(...nuevasEvidencias);

    registerAudit(db, {
      actorIdentificador: `${empleado.numeroEmpleado} - ${empleado.nombreCompleto}`,
      modulo: 'CHECKLIST',
      accion: 'REGISTRO_CHECKLIST',
      entidad: 'Checklist',
      entidadId: nuevoChecklist.folio,
      detalles: `Checklist ${nuevoChecklist.folio} completado en área ${nuevoChecklist.areaNombre}. Cumplimiento: ${porcentajeCumplimiento}% (${totalSi} Sí / ${totalNo} No).`,
    });

    writeDb(db);

    return NextResponse.json({ checklist: nuevoChecklist }, { status: 201 });
  } catch (error) {
    console.error('Error saving checklist:', error);
    return NextResponse.json(
      { error: 'Error interno al guardar el checklist.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { checklistId, respuestaId, estadoIncidencia } = body;

    const db = readDb();
    const chk = db.checklists.find((c) => c.id === checklistId);
    if (!chk) {
      return NextResponse.json({ error: 'Checklist no encontrado.' }, { status: 404 });
    }

    const resp = chk.respuestas.find((r) => r.id === respuestaId);
    if (!resp) {
      return NextResponse.json({ error: 'Incidencia no encontrada.' }, { status: 404 });
    }

    resp.estadoIncidencia = estadoIncidencia;

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'INCIDENCIAS',
      accion: 'CAMBIO_ESTADO_INCIDENCIA',
      entidad: 'Respuesta',
      entidadId: respuestaId,
      detalles: `Incidencia ${resp.preguntaCodigo} (${chk.folio}) actualizada a estado: ${estadoIncidencia}`,
    });

    writeDb(db);
    return NextResponse.json({ ok: true, respuesta: resp });
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado de incidencia.' },
      { status: 500 }
    );
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
        { error: 'Se requiere el ID de la encuesta a eliminar.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const idx = db.checklists.findIndex((c) => c.id === idParam || c.folio === idParam);

    if (idx === -1) {
      return NextResponse.json(
        { error: 'Encuesta no encontrada.' },
        { status: 404 }
      );
    }

    const removedChecklist = db.checklists[idx];

    // Contar evidencias fotográficas y escritas vinculadas antes de eliminarlas en cascada
    const evidenciasEscritasCount = removedChecklist.respuestas.filter(
      (r) => !r.respuesta && r.motivoNo
    ).length;
    const evidenciasFotograficasCount = db.evidencias.filter(
      (ev) => ev.checklistId === removedChecklist.id
    ).length;

    // 1. Eliminar la encuesta (incluyendo todas sus respuestas y motivos escritos)
    db.checklists.splice(idx, 1);

    // 2. Eliminar en cascada todas las fotografías de evidencia asociadas a esta encuesta
    db.evidencias = db.evidencias.filter((ev) => ev.checklistId !== removedChecklist.id);

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'CHECKLIST',
      accion: 'ELIMINAR_ENCUESTA_Y_EVIDENCIAS',
      entidad: 'Checklist',
      entidadId: removedChecklist.folio,
      detalles: `Encuesta ${removedChecklist.folio} (${removedChecklist.nombreEmpleado} - ${removedChecklist.areaNombre}) eliminada junto con ${evidenciasEscritasCount} evidencia(s) escrita(s) y ${evidenciasFotograficasCount} evidencia(s) fotográfica(s).`,
    });

    writeDb(db);

    return NextResponse.json({
      ok: true,
      folioEliminado: removedChecklist.folio,
      evidenciasEscritasEliminadas: evidenciasEscritasCount,
      evidenciasFotograficasEliminadas: evidenciasFotograficasCount,
    });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la encuesta y sus evidencias.' },
      { status: 500 }
    );
  }
}
