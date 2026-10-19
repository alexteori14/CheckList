import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ChecklistRecord } from '@/types';

interface ExportReportPayload {
  tituloFiltro: string;
  kpis: {
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
  };
  cumplimientoPorArea: Array<{
    areaNombre: string;
    totalChecklists: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
  }>;
  cumplimientoPorUsuario: Array<{
    numeroEmpleado: string;
    nombreCompleto: string;
    areaNombre: string;
    totalChecklists: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
  }>;
  checklists: ChecklistRecord[];
  incidencias: Array<{
    folio: string;
    fechaOperacion: string;
    numeroEmpleado: string;
    nombreEmpleado: string;
    areaNombre: string;
    preguntaCodigo: string;
    preguntaTexto: string;
    motivoNo: string;
    estadoIncidencia: string;
  }>;
}

export function exportToPDF(payload: ExportReportPayload): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString('es-MX');

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTCHECK ENTERPRISE - REPORTE EJECUTIVO DE CUMPLIMIENTO', 14, 12);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Filtro aplicado: ${payload.tituloFiltro}   |   Generado: ${nowStr}`, 14, 21);

  autoTable(doc, {
    startY: 34,
    head: [
      [
        'Total Encuestas',
        'Total Respuestas',
        'Respuestas Positivas (Sí)',
        'Respuestas Negativas (No)',
        '% Cumplimiento General',
        '% Incidencias',
      ],
    ],
    body: [
      [
        String(payload.kpis.totalChecklists),
        String(payload.kpis.totalRespuestas),
        String(payload.kpis.totalSi),
        String(payload.kpis.totalNo),
        `${payload.kpis.cumplimientoGeneral}%`,
        `${payload.kpis.porcentajeIncidencias}%`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'center', fontSize: 11, fontStyle: 'bold' },
  });

  const afterKpiY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Comparativo de Cumplimiento por Área', 14, afterKpiY);

  autoTable(doc, {
    startY: afterKpiY + 3,
    head: [['Área', 'Encuestas', 'Respuestas Sí', 'Incidencias (No)', '% Cumplimiento', '% Incidencias']],
    body: payload.cumplimientoPorArea.map((a) => [
      a.areaNombre,
      String(a.totalChecklists),
      String(a.totalSi),
      String(a.totalNo),
      `${a.cumplimientoGeneral}%`,
      `${a.porcentajeIncidencias}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const afterAreaY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Detalle de Incidencias Detectadas (Respuestas Negativas)', 14, afterAreaY);

  autoTable(doc, {
    startY: afterAreaY + 3,
    head: [['Folio', 'Fecha', 'Área', 'Empleado', 'Código', 'Motivo Obligatorio Capturado', 'Estado']],
    body:
      payload.incidencias.length > 0
        ? payload.incidencias.map((inc) => [
            inc.folio,
            inc.fechaOperacion,
            inc.areaNombre,
            `#${inc.numeroEmpleado} ${inc.nombreEmpleado}`,
            inc.preguntaCodigo,
            inc.motivoNo,
            inc.estadoIncidencia,
          ])
        : [['-', '-', '-', '-', '-', 'Sin incidencias registradas en el periodo seleccionado', '-']],
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    styles: { fontSize: 8.5 },
  });

  const afterIncY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (afterIncY > 175) {
    doc.addPage();
  }
  const startChkY = afterIncY > 175 ? 18 : afterIncY;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Bitácora de Encuestas Realizadas', 14, startChkY);

  autoTable(doc, {
    startY: startChkY + 3,
    head: [['Folio', 'Fecha', '# Empleado', 'Nombre del Empleado', 'Área', 'Sí', 'No', '% Cumplimiento']],
    body: payload.checklists.map((c) => [
      c.folio,
      c.fechaOperacion,
      c.numeroEmpleado,
      c.nombreEmpleado,
      c.areaNombre,
      String(c.totalSi),
      String(c.totalNo),
      `${c.porcentajeCumplimiento}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    styles: { fontSize: 8.5 },
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`Reporte_SmartCheck_${fileDate}.pdf`);
}

export function exportToExcel(payload: ExportReportPayload): void {
  const wb = XLSX.utils.book_new();

  const kpiRows = [
    ['SMARTCHECK ENTERPRISE - REPORTE EJECUTIVO'],
    ['Filtro Aplicado:', payload.tituloFiltro],
    ['Fecha de Generación:', new Date().toLocaleString('es-MX')],
    [],
    ['INDICADORES CLAVE (KPIs)'],
    ['Total Encuestas Realizadas', payload.kpis.totalChecklists],
    ['Total Respuestas Evaluadas', payload.kpis.totalRespuestas],
    ['Total Respuestas Positivas (Sí)', payload.kpis.totalSi],
    ['Total Respuestas Negativas (No)', payload.kpis.totalNo],
    ['Cumplimiento General (%)', `${payload.kpis.cumplimientoGeneral}%`],
    ['Porcentaje de Incidencias (%)', `${payload.kpis.porcentajeIncidencias}%`],
    [],
    ['COMPARATIVO POR ÁREA'],
    ['Área', 'Encuestas', 'Respuestas Sí', 'Respuestas No', '% Cumplimiento', '% Incidencias'],
    ...payload.cumplimientoPorArea.map((a) => [
      a.areaNombre,
      a.totalChecklists,
      a.totalSi,
      a.totalNo,
      `${a.cumplimientoGeneral}%`,
      `${a.porcentajeIncidencias}%`,
    ]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_KPIs');

  const checklistJson = payload.checklists.map((c) => ({
    Folio: c.folio,
    Fecha: c.fechaOperacion,
    Numero_Empleado: c.numeroEmpleado,
    Nombre_Empleado: c.nombreEmpleado,
    Area: c.areaNombre,
    Total_Preguntas: c.totalPreguntas,
    Respuestas_Si: c.totalSi,
    Respuestas_No: c.totalNo,
    Porcentaje_Cumplimiento: `${c.porcentajeCumplimiento}%`,
    Porcentaje_Incidencias: `${c.porcentajeIncidencias}%`,
    Duracion_Segundos: c.duracionSegundos,
    Observaciones: c.observacionesGenerales || '',
  }));
  const wsChecklists = XLSX.utils.json_to_sheet(checklistJson);
  XLSX.utils.book_append_sheet(wb, wsChecklists, 'Encuestas');

  const incidenciasJson = payload.incidencias.map((inc) => ({
    Folio_Encuesta: inc.folio,
    Fecha: inc.fechaOperacion,
    Area: inc.areaNombre,
    Numero_Empleado: inc.numeroEmpleado,
    Nombre_Empleado: inc.nombreEmpleado,
    Codigo_Pregunta: inc.preguntaCodigo,
    Pregunta: inc.preguntaTexto,
    Motivo_Obligatorio_No: inc.motivoNo,
    Estado_Incidencia: inc.estadoIncidencia,
  }));
  const wsIncidencias = XLSX.utils.json_to_sheet(
    incidenciasJson.length > 0
      ? incidenciasJson
      : [{ Mensaje: 'Sin incidencias registradas en el filtro seleccionado' }]
  );
  XLSX.utils.book_append_sheet(wb, wsIncidencias, 'Incidencias_No');

  const usuariosJson = payload.cumplimientoPorUsuario.map((u) => ({
    Numero_Empleado: u.numeroEmpleado,
    Nombre_Completo: u.nombreCompleto,
    Area: u.areaNombre,
    Encuestas_Realizadas: u.totalChecklists,
    Respuestas_Si: u.totalSi,
    Respuestas_No: u.totalNo,
    Cumplimiento_Porcentaje: `${u.cumplimientoGeneral}%`,
  }));
  const wsUsuarios = XLSX.utils.json_to_sheet(usuariosJson);
  XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Cumplimiento_Usuarios');

  const fileDate = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Reporte_SmartCheck_${fileDate}.xlsx`);
}
