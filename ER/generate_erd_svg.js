const fs = require('fs');
const path = require('path');

const tables = [
  {
    id: 'areas',
    name: 'areas',
    x: 480,
    y: 100,
    width: 320,
    columns: [
      { name: 'id', type: 'INT', icon: 'pk' },
      { name: 'codigo', type: 'VARCHAR(50)', icon: 'nn' },
      { name: 'nombre', type: 'VARCHAR(120)', icon: 'nn' },
      { name: 'descripcion', type: 'TEXT', icon: 'null' },
      { name: 'color_hex', type: 'VARCHAR(20)', icon: 'nn' },
      { name: 'icono', type: 'VARCHAR(50)', icon: 'nn' },
      { name: 'responsable', type: 'VARCHAR(150)', icon: 'null' },
      { name: 'hora_inicio', type: 'VARCHAR(10)', icon: 'nn' },
      { name: 'hora_fin', type: 'VARCHAR(10)', icon: 'nn' },
      { name: 'activo', type: 'TINYINT(1)', icon: 'nn' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
      { name: 'updated_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_areas_codigo', 'uk_areas_nombre']
  },
  {
    id: 'usuarios',
    name: 'usuarios',
    x: 960,
    y: 100,
    width: 320,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'username', type: 'VARCHAR(80)', icon: 'nn' },
      { name: 'email', type: 'VARCHAR(150)', icon: 'null' },
      { name: 'password_hash', type: 'TEXT', icon: 'nn' },
      { name: 'nombre_completo', type: 'VARCHAR(180)', icon: 'nn' },
      { name: 'rol', type: 'VARCHAR(50)', icon: 'nn' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'activo', type: 'TINYINT(1)', icon: 'nn' },
      { name: 'ultimo_acceso', type: 'DATETIME', icon: 'null' },
      { name: 'intentos_fallidos', type: 'SMALLINT', icon: 'nn' },
      { name: 'bloqueado_hasta', type: 'DATETIME', icon: 'null' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
      { name: 'updated_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_usuarios_username', 'uk_usuarios_email', 'idx_usuarios_rol', 'idx_usuarios_area_id']
  },
  {
    id: 'empleados',
    name: 'empleados',
    x: 50,
    y: 480,
    width: 330,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'numero_empleado', type: 'VARCHAR(40)', icon: 'nn' },
      { name: 'nombre_completo', type: 'VARCHAR(180)', icon: 'nn' },
      { name: 'correo', type: 'VARCHAR(150)', icon: 'null' },
      { name: 'puesto', type: 'VARCHAR(120)', icon: 'null' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'area_id_secundaria', type: 'INT', icon: 'fk' },
      { name: 'usuario_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'activo', type: 'TINYINT(1)', icon: 'nn' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
      { name: 'updated_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_empleados_numero', 'idx_empleados_numero', 'idx_empleados_area', 'idx_empleados_area_sec']
  },
  {
    id: 'preguntas',
    name: 'preguntas',
    x: 520,
    y: 500,
    width: 310,
    columns: [
      { name: 'id', type: 'INT', icon: 'pk' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'codigo', type: 'VARCHAR(50)', icon: 'nn' },
      { name: 'categoria', type: 'VARCHAR(100)', icon: 'nn' },
      { name: 'texto', type: 'TEXT', icon: 'nn' },
      { name: 'descripcion_ayuda', type: 'TEXT', icon: 'null' },
      { name: 'orden', type: 'SMALLINT', icon: 'nn' },
      { name: 'criticidad', type: 'ENUM', icon: 'nn' },
      { name: 'activo', type: 'TINYINT(1)', icon: 'nn' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
      { name: 'updated_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_preguntas_codigo', 'idx_preguntas_area_orden']
  },
  {
    id: 'checklists',
    name: 'checklists',
    x: 480,
    y: 910,
    width: 350,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'folio', type: 'VARCHAR(40)', icon: 'nn' },
      { name: 'empleado_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'numero_empleado', type: 'VARCHAR(40)', icon: 'nn' },
      { name: 'nombre_empleado', type: 'VARCHAR(180)', icon: 'nn' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'fecha_operacion', type: 'DATE', icon: 'nn' },
      { name: 'hora_registro', type: 'VARCHAR(10)', icon: 'nn' },
      { name: 'estado_tiempo', type: 'ENUM', icon: 'nn' },
      { name: 'total_preguntas', type: 'SMALLINT', icon: 'nn' },
      { name: 'total_si', type: 'SMALLINT', icon: 'nn' },
      { name: 'total_no', type: 'SMALLINT', icon: 'nn' },
      { name: 'porcentaje_cumplimiento', type: 'DECIMAL(5,2)', icon: 'nn' },
      { name: 'porcentaje_incidencias', type: 'DECIMAL(5,2)', icon: 'nn' },
      { name: 'duracion_segundos', type: 'INT', icon: 'null' },
      { name: 'dispositivo', type: 'VARCHAR(120)', icon: 'null' },
      { name: 'estado', type: 'ENUM', icon: 'nn' },
      { name: 'observaciones_generales', type: 'TEXT', icon: 'null' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
      { name: 'updated_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_checklists_folio', 'idx_checklists_fecha', 'idx_checklists_area_fecha', 'idx_checklists_empleado']
  },
  {
    id: 'respuestas',
    name: 'respuestas',
    x: 960,
    y: 530,
    width: 310,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'checklist_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'pregunta_id', type: 'INT', icon: 'fk' },
      { name: 'respuesta', type: 'TINYINT(1)', icon: 'nn' },
      { name: 'motivo_no', type: 'TEXT', icon: 'null' },
      { name: 'estado_incidencia', type: 'ENUM', icon: 'null' },
      { name: 'respondido_en', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_respuestas_chk_prg', 'idx_respuestas_checklist', 'idx_respuestas_incidencias']
  },
  {
    id: 'evidencias',
    name: 'evidencias',
    x: 1390,
    y: 530,
    width: 320,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'respuesta_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'checklist_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'nombre_archivo', type: 'VARCHAR(255)', icon: 'nn' },
      { name: 'formato', type: 'ENUM', icon: 'nn' },
      { name: 'mime_type', type: 'VARCHAR(60)', icon: 'nn' },
      { name: 'tamano_bytes', type: 'INT', icon: 'nn' },
      { name: 'blob_url', type: 'MEDIUMTEXT', icon: 'nn' },
      { name: 'origen_captura', type: 'ENUM', icon: 'nn' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'idx_evidencias_respuesta', 'idx_evidencias_checklist']
  },
  {
    id: 'notificaciones',
    name: 'notificaciones',
    x: 50,
    y: 970,
    width: 320,
    columns: [
      { name: 'id', type: 'CHAR(36)', icon: 'pk' },
      { name: 'empleado_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'fecha', type: 'DATE', icon: 'nn' },
      { name: 'tipo', type: 'VARCHAR(50)', icon: 'nn' },
      { name: 'destinatario', type: 'VARCHAR(150)', icon: 'nn' },
      { name: 'estado', type: 'ENUM', icon: 'nn' },
      { name: 'detalle', type: 'TEXT', icon: 'null' },
      { name: 'intentos', type: 'SMALLINT', icon: 'nn' },
      { name: 'enviado_en', type: 'DATETIME', icon: 'null' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'idx_notificaciones_fecha_area', 'idx_notificaciones_empleado']
  },
  {
    id: 'estadisticas',
    name: 'estadisticas',
    x: 960,
    y: 910,
    width: 320,
    columns: [
      { name: 'id', type: 'INT', icon: 'pk' },
      { name: 'periodo_tipo', type: 'ENUM', icon: 'nn' },
      { name: 'fecha_inicio', type: 'DATE', icon: 'nn' },
      { name: 'fecha_fin', type: 'DATE', icon: 'nn' },
      { name: 'area_id', type: 'INT', icon: 'fk' },
      { name: 'total_checklists', type: 'INT', icon: 'nn' },
      { name: 'total_respuestas', type: 'INT', icon: 'nn' },
      { name: 'total_si', type: 'INT', icon: 'nn' },
      { name: 'total_no', type: 'INT', icon: 'nn' },
      { name: 'porcentaje_cumplimiento', type: 'DECIMAL(5,2)', icon: 'nn' },
      { name: 'porcentaje_incidencias', type: 'DECIMAL(5,2)', icon: 'nn' },
      { name: 'calculado_en', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'uk_estadisticas_periodo', 'idx_estadisticas_periodo']
  },
  {
    id: 'auditoria',
    name: 'auditoria',
    x: 1390,
    y: 910,
    width: 320,
    columns: [
      { name: 'id', type: 'BIGINT', icon: 'pk' },
      { name: 'usuario_id', type: 'CHAR(36)', icon: 'fk' },
      { name: 'actor_identificador', type: 'VARCHAR(120)', icon: 'nn' },
      { name: 'modulo', type: 'VARCHAR(80)', icon: 'nn' },
      { name: 'accion', type: 'VARCHAR(80)', icon: 'nn' },
      { name: 'entidad', type: 'VARCHAR(80)', icon: 'nn' },
      { name: 'entidad_id', type: 'VARCHAR(120)', icon: 'null' },
      { name: 'datos_anteriores', type: 'JSON', icon: 'null' },
      { name: 'datos_nuevos', type: 'JSON', icon: 'null' },
      { name: 'ip_address', type: 'VARCHAR(60)', icon: 'null' },
      { name: 'user_agent', type: 'TEXT', icon: 'null' },
      { name: 'created_at', type: 'DATETIME', icon: 'nn' },
    ],
    indexes: ['PRIMARY', 'idx_auditoria_usuario', 'idx_auditoria_fecha_modulo']
  }
];

function calcHeight(t) {
  return 28 + (t.columns.length * 20) + 22 + (t.indexes.length * 18) + 8;
}

tables.forEach(t => {
  t.height = calcHeight(t);
});

// Clean routing paths without cutting through any tables
const lines = [
  // 1. areas -> usuarios (area_id) direct horizontal
  { points: [[800, 210], [960, 210]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'left' },
  
  // 4. areas -> empleados (area_id) through left gap at X=420
  { points: [[480, 280], [420, 280], [420, 590], [380, 590]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'left', toDir: 'right' },
  
  // 5. areas -> preguntas (area_id) direct vertical
  { points: [[660, 405], [660, 500]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'bottom', toDir: 'top' },
  
  // 6. areas -> checklists (area_id) routed around preguntas through gap X=450
  { points: [[520, 405], [520, 440], [450, 440], [450, 870], [530, 870], [530, 910]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'bottom', toDir: 'top' },
  
  // 7. areas -> estadisticas (area_id) through middle gap X=890
  { points: [[780, 405], [780, 450], [890, 450], [890, 870], [1020, 870], [1020, 910]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'bottom', toDir: 'top' },
  
  // 8. areas -> notificaciones (area_id) through left corridor X=410
  { points: [[480, 340], [405, 340], [405, 940], [240, 940], [240, 970]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'left', toDir: 'top' },
  
  // 9. usuarios -> empleados (usuario_id) through upper horizontal corridor
  { points: [[960, 240], [430, 240], [430, 650], [380, 650]], dashed: true, fromEnd: '0..1', toEnd: '0..1', fromDir: 'left', toDir: 'right' },
  
  // 10. usuarios -> auditoria (usuario_id) through right corridor X=1330
  { points: [[1280, 230], [1340, 230], [1340, 870], [1460, 870], [1460, 910]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'top' },
  
  // 11. empleados -> checklists (empleado_id)
  { points: [[380, 700], [440, 700], [440, 940], [480, 940]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'left' },
  
  // 12. empleados -> notificaciones (empleado_id) straight down
  { points: [[140, 785], [140, 970]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'bottom', toDir: 'top' },
  
  // 13. checklists -> respuestas (checklist_id)
  { points: [[830, 960], [900, 960], [900, 680], [960, 680]], dashed: false, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'left' },
  
  // 14. checklists -> evidencias (checklist_id) routed around
  { points: [[830, 1010], [920, 1010], [920, 830], [1450, 830], [1450, 785]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'bottom' },
  
  // 15. preguntas -> respuestas (pregunta_id)
  { points: [[830, 560], [960, 560]], dashed: true, fromEnd: '1', toEnd: 'N', fromDir: 'right', toDir: 'left' },
  
  // 16. respuestas -> evidencias (respuesta_id)
  { points: [[1270, 600], [1390, 600]], dashed: false, fromEnd: '1', toEnd: '0..1', fromDir: 'right', toDir: 'left' },
];

function drawCrowFoot(x, y, dir, type) {
  let svg = '';
  const forkSize = 10;
  const tickDist = 7;
  const tickDist2 = 12;

  let vx = 0, vy = 0;
  if (dir === 'left') { vx = -1; vy = 0; }
  else if (dir === 'right') { vx = 1; vy = 0; }
  else if (dir === 'top') { vx = 0; vy = -1; }
  else if (dir === 'bottom') { vx = 0; vy = 1; }

  const px = -vy;
  const py = vx;

  if (type === '1') {
    const x1 = x + vx * tickDist;
    const y1 = y + vy * tickDist;
    const x2 = x + vx * tickDist2;
    const y2 = y + vy * tickDist2;
    svg += `<line x1="${x1 - px * 6}" y1="${y1 - py * 6}" x2="${x1 + px * 6}" y2="${y1 + py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<line x1="${x2 - px * 6}" y1="${y2 - py * 6}" x2="${x2 + px * 6}" y2="${y2 + py * 6}" stroke="#222" stroke-width="1.3"/>`;
  } else if (type === '0..1') {
    const x1 = x + vx * tickDist;
    const y1 = y + vy * tickDist;
    const x2 = x + vx * 14;
    const y2 = y + vy * 14;
    svg += `<line x1="${x1 - px * 6}" y1="${y1 - py * 6}" x2="${x1 + px * 6}" y2="${y1 + py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<circle cx="${x2}" cy="${y2}" r="3.5" fill="#ffffff" stroke="#222" stroke-width="1.2"/>`;
  } else if (type === 'N') {
    const xFork = x + vx * forkSize;
    const yFork = y + vy * forkSize;
    const xTick = x + vx * (forkSize + 5);
    const yTick = y + vy * (forkSize + 5);
    svg += `<line x1="${x}" y1="${y}" x2="${xFork - px * 6}" y2="${yFork - py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<line x1="${x}" y1="${y}" x2="${xFork + px * 6}" y2="${yFork + py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<line x1="${xTick - px * 6}" y1="${yTick - py * 6}" x2="${xTick + px * 6}" y2="${yTick + py * 6}" stroke="#222" stroke-width="1.3"/>`;
  } else if (type === '0..N') {
    const xFork = x + vx * forkSize;
    const yFork = y + vy * forkSize;
    const xCircle = x + vx * (forkSize + 7);
    const yCircle = y + vy * (forkSize + 7);
    svg += `<line x1="${x}" y1="${y}" x2="${xFork - px * 6}" y2="${yFork - py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<line x1="${x}" y1="${y}" x2="${xFork + px * 6}" y2="${yFork + py * 6}" stroke="#222" stroke-width="1.3"/>`;
    svg += `<circle cx="${xCircle}" cy="${yCircle}" r="3.5" fill="#ffffff" stroke="#222" stroke-width="1.2"/>`;
  }
  return svg;
}

let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1820 1520" width="1820" height="1520" style="background:#f4f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Blueprint / Workbench Engineering Grid -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3e8ee" stroke-width="0.8"/>
    </pattern>
    <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d5dde6" stroke-width="1.2"/>
    </pattern>

    <!-- Header Gradient (Classic MySQL Workbench Steel Blue) -->
    <linearGradient id="wbHeader" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6996bf"/>
      <stop offset="100%" stop-color="#4d779f"/>
    </linearGradient>

    <!-- Indexes Section Gradient -->
    <linearGradient id="wbIndex" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cfd4da"/>
      <stop offset="100%" stop-color="#bdc3ca"/>
    </linearGradient>

    <!-- Workbench Table Shadow -->
    <filter id="tableShadow" x="-3%" y="-2%" width="106%" height="108%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.14"/>
    </filter>

    <!-- Table Icon -->
    <g id="ico-tbl">
      <rect x="0" y="0" width="14" height="11" rx="1.5" fill="#ffffff" fill-opacity="0.25" stroke="#ffffff" stroke-width="1"/>
      <line x1="0" y1="4" x2="14" y2="4" stroke="#ffffff" stroke-width="0.9"/>
      <line x1="7" y1="4" x2="7" y2="11" stroke="#ffffff" stroke-width="0.9"/>
    </g>

    <!-- Yellow Key (PK) -->
    <g id="ico-pk">
      <circle cx="5" cy="5" r="3.6" fill="#e8b910" stroke="#947400" stroke-width="0.8"/>
      <circle cx="5" cy="5" r="1.3" fill="#ffffff"/>
      <path d="M 7.5 6.5 L 12 11 L 10.5 12.5 L 9 11 L 7.5 12.2 L 6.5 11" fill="none" stroke="#947400" stroke-width="1.4" stroke-linecap="round"/>
    </g>

    <!-- Red Diamond (FK) -->
    <g id="ico-fk">
      <polygon points="6,1 11.5,6.5 6,12 0.5,6.5" fill="#d9534f" stroke="#9e201c" stroke-width="0.8"/>
    </g>

    <!-- Blue Diamond (NOT NULL) -->
    <g id="ico-nn">
      <polygon points="6,1 11.5,6.5 6,12 0.5,6.5" fill="#0288d1" stroke="#01579b" stroke-width="0.8"/>
    </g>

    <!-- White Diamond (NULL) -->
    <g id="ico-null">
      <polygon points="6,1 11.5,6.5 6,12 0.5,6.5" fill="#ffffff" stroke="#0288d1" stroke-width="1"/>
    </g>
  </defs>

  <!-- Canvas Background with Grid -->
  <rect width="100%" height="100%" fill="#f4f7f9"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect width="100%" height="100%" fill="url(#majorGrid)"/>

  <!-- Title & Model Header Bar -->
  <g transform="translate(50, 20)">
    <rect x="0" y="0" width="1720" height="42" rx="4" fill="#ffffff" stroke="#ccd5df" stroke-width="1"/>
    <text x="20" y="26" font-size="15" font-weight="bold" fill="#1e293b">SmartCheck Enterprise — Diagrama Físico EER (MySQL Workbench Style)</text>
    <text x="620" y="26" font-size="12" fill="#64748b">Motor: MySQL Server 8.0+ / InnoDB / 3FN | Crow's Foot | 10 Tablas (Sin tabla roles)</text>
    
    <!-- Legend -->
    <g transform="translate(1260, 14)">
      <use href="#ico-pk" x="0" y="0"/>
      <text x="16" y="10" font-size="11" font-weight="600" fill="#334155">PK</text>
      
      <use href="#ico-fk" x="42" y="0"/>
      <text x="56" y="10" font-size="11" font-weight="600" fill="#334155">FK</text>
      
      <use href="#ico-nn" x="80" y="0"/>
      <text x="94" y="10" font-size="11" font-weight="600" fill="#334155">NOT NULL</text>
      
      <use href="#ico-null" x="165" y="0"/>
      <text x="179" y="10" font-size="11" font-weight="600" fill="#334155">NULL</text>

      <line x1="220" y1="7" x2="245" y2="7" stroke="#333" stroke-width="1.3" stroke-dasharray="4,3"/>
      <text x="250" y="10" font-size="10" fill="#64748b">No Identificadora</text>

      <line x1="340" y1="7" x2="365" y2="7" stroke="#333" stroke-width="1.3"/>
      <text x="370" y="10" font-size="10" fill="#64748b">Identificadora</text>
    </g>
  </g>

  <!-- Connectors (Drawn below tables) -->
  <g id="relationships">
`;

lines.forEach(line => {
  let pathD = 'M ' + line.points[0][0] + ' ' + line.points[0][1];
  for (let i = 1; i < line.points.length; i++) {
    pathD += ' L ' + line.points[i][0] + ' ' + line.points[i][1];
  }
  const strokeDash = line.dashed ? 'stroke-dasharray="6,4"' : '';
  const strokeColor = line.dashed ? '#374151' : '#111827';
  const strokeWidth = line.dashed ? '1.25' : '1.5';

  svg += `    <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash}/>\n`;

  const pStart = line.points[0];
  svg += '    ' + drawCrowFoot(pStart[0], pStart[1], line.fromDir, line.fromEnd) + '\n';

  const pEnd = line.points[line.points.length - 1];
  svg += '    ' + drawCrowFoot(pEnd[0], pEnd[1], line.toDir, line.toEnd) + '\n';
});

svg += `  </g>\n\n  <!-- Tables -->\n  <g id="tables">\n`;

tables.forEach(t => {
  svg += `    <!-- TABLE: ${t.name} -->\n`;
  svg += `    <g transform="translate(${t.x}, ${t.y})" filter="url(#tableShadow)">\n`;
  svg += `      <rect x="0" y="0" width="${t.width}" height="${t.height}" rx="4" fill="#ffffff" stroke="#3c6f9e" stroke-width="1.2"/>\n`;
  svg += `      <path d="M 0 4 Q 0 0 4 0 L ${t.width - 4} 0 Q ${t.width} 0 ${t.width} 4 L ${t.width} 28 L 0 28 Z" fill="url(#wbHeader)"/>\n`;
  svg += `      <line x1="0" y1="28" x2="${t.width}" y2="28" stroke="#355e86" stroke-width="1"/>\n`;
  svg += `      <use href="#ico-tbl" x="8" y="8"/>\n`;
  svg += `      <text x="28" y="19" font-size="12" font-weight="bold" fill="#ffffff" letter-spacing="0.3">${t.name}</text>\n`;
  svg += `      <polygon points="${t.width - 15},11 ${t.width - 7},11 ${t.width - 11},17" fill="#ffffff" fill-opacity="0.8"/>\n`;

  let curY = 28;
  t.columns.forEach((c, idx) => {
    const rowY = curY + (idx * 20);
    if (idx % 2 === 1) {
      svg += `      <rect x="1" y="${rowY}" width="${t.width - 2}" height="20" fill="#fafbfc"/>\n`;
    }
    let iconHref = '#ico-null';
    if (c.icon === 'pk') iconHref = '#ico-pk';
    else if (c.icon === 'fk') iconHref = '#ico-fk';
    else if (c.icon === 'nn') iconHref = '#ico-nn';

    svg += `      <use href="${iconHref}" x="8" y="${rowY + 3}"/>\n`;
    const fontWt = (c.icon === 'pk' || c.icon === 'fk') ? 'font-weight="600"' : '';
    svg += `      <text x="28" y="${rowY + 14}" font-size="11" ${fontWt} fill="#1f2937">${c.name}</text>\n`;
    svg += `      <text x="${t.width - 10}" y="${rowY + 14}" font-size="10" font-weight="500" fill="#4b5563" text-anchor="end">${c.type}</text>\n`;
  });

  curY += t.columns.length * 20;

  svg += `      <g transform="translate(0, ${curY})">\n`;
  svg += `        <rect x="0" y="0" width="${t.width}" height="22" fill="url(#wbIndex)"/>\n`;
  svg += `        <line x1="0" y1="0" x2="${t.width}" y2="0" stroke="#abb2bb" stroke-width="0.8"/>\n`;
  svg += `        <line x1="0" y1="22" x2="${t.width}" y2="22" stroke="#abb2bb" stroke-width="0.8"/>\n`;
  svg += `        <polygon points="9,7 9,15 15,11" fill="#475569"/>\n`;
  svg += `        <text x="20" y="15" font-size="11" font-weight="bold" fill="#334155">Indexes</text>\n`;
  svg += `      </g>\n`;

  curY += 22;

  t.indexes.forEach((idxName, i) => {
    const idxY = curY + (i * 18);
    const isPrimary = idxName === 'PRIMARY';
    const fillCol = isPrimary ? '#92400e' : '#475569';
    const fontWt = isPrimary ? 'font-weight="bold"' : 'font-weight="normal"';
    svg += `      <rect x="1" y="${idxY}" width="${t.width - 2}" height="18" fill="${i % 2 === 1 ? '#f8fafc' : '#ffffff'}"/>\n`;
    svg += `      <circle cx="12" cy="${idxY + 9}" r="2" fill="${fillCol}"/>\n`;
    svg += `      <text x="22" y="${idxY + 13}" font-size="10" ${fontWt} fill="${fillCol}">${idxName}</text>\n`;
  });

  svg += `    </g>\n\n`;
});

svg += `  </g>\n</svg>`;

const outputPath = path.join(__dirname, 'ER_Diagrama_Fisico.svg');
fs.writeFileSync(outputPath, svg, 'utf8');
console.log('Successfully generated MySQL ERD SVG:', outputPath);
