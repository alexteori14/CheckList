import fs from 'fs';
import path from 'path';
import {
  Area,
  AuditLog,
  ChecklistRecord,
  DatabaseSchema,
  Empleado,
  EstadisticaRegistro,
  Evidencia,
  Pregunta,
  RespuestaItem,
  Role,
} from '@/types';
import { hashPassword } from './auth';

const DB_DIR = path.join(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'smartcheck_db.json');

export function getLocalISODate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSampleEvidenceSvgDataUrl(title: string, area: string, date: string, code: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="640" height="420" fill="url(#bg)" rx="16"/>
    <rect x="24" y="24" width="592" height="372" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="8 4" rx="12"/>
    <circle cx="320" cy="150" r="46" fill="#ef4444" fill-opacity="0.18"/>
    <path d="M320 122 L320 156 M320 172 L320.02 172" stroke="#f87171" stroke-width="6" stroke-linecap="round"/>
    <text x="320" y="235" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="20" font-weight="bold">EVIDENCIA DE INCIDENCIA: ${code}</text>
    <text x="320" y="270" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="15">${title}</text>
    <rect x="170" y="305" width="300" height="42" rx="8" fill="#334155"/>
    <text x="320" y="331" text-anchor="middle" fill="#38bdf8" font-family=" monospace" font-size="14">Área: ${area} | ${date}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildInitialDatabase(): DatabaseSchema {
  const nowIso = new Date().toISOString();
  const defaultAdminPass = hashPassword('admin123');

  const roles: Role[] = [
    {
      id: 1,
      codigo: 'ADMIN',
      nombre: 'Administrador General',
      descripcion: 'Control total de usuarios, áreas, plantillas de checklist, dashboard y auditoría.',
      permisos: ['*'],
      activo: true,
    },
    {
      id: 2,
      codigo: 'SUPERVISOR',
      nombre: 'Supervisor de Área',
      descripcion: 'Supervisión ejecutiva de KPIs, reportes y seguimiento de incidencias.',
      permisos: ['dashboard.view', 'reports.export', 'checklist.execute', 'incidents.manage'],
      activo: true,
    },
    {
      id: 3,
      codigo: 'OPERADOR',
      nombre: 'Especialista Operativo',
      descripcion: 'Ejecución de checklists diarios en campo y captura de evidencias.',
      permisos: ['checklist.execute'],
      activo: true,
    },
  ];

  const areas: Area[] = [
    {
      id: 1,
      codigo: 'INFRA',
      nombre: 'Infraestructura',
      descripcion: 'Centros de datos, telecomunicaciones, energía ininterrumpida (UPS) y climatización.',
      colorHex: '#2563EB',
      icono: 'Server',
      responsable: 'Ing. Roberto Méndez',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 2,
      codigo: 'CTRL',
      nombre: 'Control',
      descripcion: 'Sistemas de control industrial, instrumentación, tableros PLC, SCADA y seguridad.',
      colorHex: '#7C3AED',
      icono: 'Sliders',
      responsable: 'Ing. Laura Gómez',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 3,
      codigo: 'MANT',
      nombre: 'Mantenimiento',
      descripcion: 'Mantenimiento preventivo y correctivo de líneas operativas, equipos y herramientas.',
      colorHex: '#059669',
      icono: 'Wrench',
      responsable: 'Ing. Carlos Villarreal',
      activo: true,
      createdAt: nowIso,
    },
  ];

  const empleados: Empleado[] = [
    {
      id: 'emp-1000',
      numeroEmpleado: '1000',
      nombreCompleto: 'Oscar Mercado',
      correo: 'oscar.mercado@empresa.com',
      puesto: 'Administrador General de Sistemas',
      areaId: 1,
      areaNombre: 'Infraestructura',
      rolCodigo: 'ADMIN',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-1001',
      numeroEmpleado: '1001',
      nombreCompleto: 'Ing. Roberto Méndez',
      correo: 'roberto.mendez@empresa.com',
      puesto: 'Jefe de Departamento de Infraestructura',
      areaId: 1,
      areaNombre: 'Infraestructura',
      rolCodigo: 'SUPERVISOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-1002',
      numeroEmpleado: '1002',
      nombreCompleto: 'Ing. Laura Gómez',
      correo: 'laura.gomez@empresa.com',
      puesto: 'Jefa de Departamento de Control',
      areaId: 2,
      areaNombre: 'Control',
      rolCodigo: 'SUPERVISOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-1003',
      numeroEmpleado: '1003',
      nombreCompleto: 'Ing. Carlos Villarreal',
      correo: 'carlos.villarreal@empresa.com',
      puesto: 'Jefe de Departamento de Mantenimiento',
      areaId: 3,
      areaNombre: 'Mantenimiento',
      rolCodigo: 'SUPERVISOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2001',
      numeroEmpleado: '2001',
      nombreCompleto: 'Alejandro Puentes',
      correo: 'alejandro.puentes@empresa.com',
      puesto: 'Especialista de Infraestructura Crítica',
      areaId: 1,
      areaNombre: 'Infraestructura',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2002',
      numeroEmpleado: '2002',
      nombreCompleto: 'Sofía Hernández',
      correo: 'sofia.hernandez@empresa.com',
      puesto: 'Ingeniera de Control y PLC',
      areaId: 2,
      areaNombre: 'Control',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2003',
      numeroEmpleado: '2003',
      nombreCompleto: 'Miguel Ángel Torres',
      correo: 'miguel.torres@empresa.com',
      puesto: 'Técnico Senior de Mantenimiento',
      areaId: 3,
      areaNombre: 'Mantenimiento',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2004',
      numeroEmpleado: '2004',
      nombreCompleto: 'Valeria Ramírez',
      correo: 'valeria.ramirez@empresa.com',
      puesto: 'Analista de Redes y Servidores',
      areaId: 1,
      areaNombre: 'Infraestructura',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2005',
      numeroEmpleado: '2005',
      nombreCompleto: 'Fernando Castillo',
      correo: 'fernando.castillo@empresa.com',
      puesto: 'Instrumentista de Planta',
      areaId: 2,
      areaNombre: 'Control',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2006',
      numeroEmpleado: '2006',
      nombreCompleto: 'Diana Morales',
      correo: 'diana.morales@empresa.com',
      puesto: 'Especialista Electromecánico',
      areaId: 3,
      areaNombre: 'Mantenimiento',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const preguntas: Pregunta[] = [
    // INFRAESTRUCTURA (areaId = 1)
    {
      id: 101,
      areaId: 1,
      codigo: 'INF-01',
      categoria: 'Climatización y Ambiente',
      texto: '¿La temperatura y humedad del Site / Cuarto de Servidores se encuentran dentro del rango óptimo (18°C - 23°C)?',
      descripcionAyuda: 'Verificar termómetro digital del pasillo frío y estado de unidades HVAC sin códigos de alarma.',
      sugerenciasMotivoNo: [
        'Temperatura superior a 24°C en pasillo frío',
        'Falla en unidad de aire acondicionado de precisión',
        'Humedad fuera de rango permitido',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 102,
      areaId: 1,
      codigo: 'INF-02',
      categoria: 'Energía y Respaldo',
      texto: '¿Los sistemas UPS y bancos de baterías operan en línea sin alertas y con carga superior al 95%?',
      descripcionAyuda: 'Confirmar en el panel frontal del UPS ausencia de indicadores en ámbar o rojo.',
      sugerenciasMotivoNo: [
        'Alerta de batería en reemplazo en UPS principal',
        'Variación de voltaje en línea de entrada',
        'UPS operando en modo Bypass',
      ],
      orden: 2,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 103,
      areaId: 1,
      codigo: 'INF-03',
      categoria: 'Comunicaciones y Racks',
      texto: '¿Los gabinetes de telecomunicaciones tienen el cableado organizado, puertas cerradas y switches sin puertos en falla?',
      descripcionAyuda: 'Inspeccionar visualmente patch panels, organizadores verticales y LEDs de estado.',
      sugerenciasMotivoNo: [
        'Cables de parcheo sueltos o sin etiquetar',
        'Puerta de rack sin seguro',
        'Switch con alerta de puerto caído',
      ],
      orden: 3,
      criticidad: 'MEDIA',
      activo: true,
    },
    {
      id: 104,
      areaId: 1,
      codigo: 'INF-04',
      categoria: 'Seguridad Física',
      texto: '¿El control de acceso biométrico, cámaras CCTV y sensores contra incendio funcionan correctamente?',
      descripcionAyuda: 'Validar que la cerradura electromagnética cierre al 100% y el panel de detección esté en verde.',
      sugerenciasMotivoNo: [
        'Lector biométrico no reconoce huella',
        'Cámara de acceso con imagen obstruida',
        'Sensor de humo reporta mantenimiento requerido',
      ],
      orden: 4,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 105,
      areaId: 1,
      codigo: 'INF-05',
      categoria: 'Orden y Limpieza 5S',
      texto: '¿El área técnica se encuentra libre de cajas, polvo, líquidos o materiales inflamables?',
      descripcionAyuda: 'Ningún equipo en tránsito debe obstruir pasillos ni salidas de emergencia.',
      sugerenciasMotivoNo: [
        'Cajas de cartón almacenadas temporalmente en el site',
        'Acumulación de polvo en piso falso',
        'Herramienta olvidada sobre gabinete',
      ],
      orden: 5,
      criticidad: 'BAJA',
      activo: true,
    },

    // CONTROL (areaId = 2)
    {
      id: 201,
      areaId: 2,
      codigo: 'CTR-01',
      categoria: 'Automatización y PLC',
      texto: '¿Los controladores lógicos programables (PLC) se encuentran en modo RUN y sin LEDs de fallo (SF/BF)?',
      descripcionAyuda: 'Revisar gabinete de control principal y módulos de entradas/salidas remotas.',
      sugerenciasMotivoNo: [
        'LED de fallo de bus (BF) intermitente en módulo remoto',
        'PLC en modo STOP tras corte eléctrico',
        'Alarma activa en tarjeta analógica',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 202,
      areaId: 2,
      codigo: 'CTR-02',
      categoria: 'Supervisión SCADA / HMI',
      texto: '¿Las pantallas HMI y el sistema SCADA muestran comunicación activa en tiempo real con todos los nodos?',
      descripcionAyuda: 'Confirmar que no existan signos de interrogación ni valores congelados en las pantallas operativas.',
      sugerenciasMotivoNo: [
        'Pérdida de enlace Ethernet con estación HMI #2',
        'Retraso mayor a 5 segundos en actualización de tags',
        'Pantalla táctil descalibrada',
      ],
      orden: 2,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 203,
      areaId: 2,
      codigo: 'CTR-03',
      categoria: 'Instrumentación',
      texto: '¿Los sensores de presión, caudal y temperatura registran lecturas dentro de los parámetros de proceso?',
      descripcionAyuda: 'Verificar manómetros locales contra lectura digital en lazo 4-20 mA.',
      sugerenciasMotivoNo: [
        'Desviación entre lectura de manómetro y transmisor digital',
        'Sensor de temperatura con lectura fuera de escala',
        'Cable de señal con forro deteriorado',
      ],
      orden: 3,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 204,
      areaId: 2,
      codigo: 'CTR-04',
      categoria: 'Seguridad Funcional',
      texto: '¿Todos los botones de Paro de Emergencia y cortinas ópticas están habilitados, libres de obstrucciones y sin puentes?',
      descripcionAyuda: 'Inspeccionar relevadores de seguridad y verificar acceso despejado a botoneras rojas.',
      sugerenciasMotivoNo: [
        'Paro de emergencia obstruido por tarima de material',
        'Cortina óptica con lente sucio o desalineado',
        'Etiqueta de identificación de botonera dañada',
      ],
      orden: 4,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 205,
      areaId: 2,
      codigo: 'CTR-05',
      categoria: 'Gabinetes Eléctricos',
      texto: '¿Los tableros de control cuentan con diagramas actualizados, ventilación operativa y cierre hermético?',
      descripcionAyuda: 'Comprobar que los filtros de los ventiladores de gabinete estén limpios y las puertas aseguradas.',
      sugerenciasMotivoNo: [
        'Ventilador extractor de gabinete detenido',
        'Filtro de polvo saturado en puerta de tablero',
        'Falta diagrama unifilar en porta-planos',
      ],
      orden: 5,
      criticidad: 'MEDIA',
      activo: true,
    },

    // MANTENIMIENTO (areaId = 3)
    {
      id: 301,
      areaId: 3,
      codigo: 'MNT-01',
      categoria: 'Seguridad en Maquinaria',
      texto: '¿Todas las guardas físicas y cubiertas protectoras están instaladas y aseguradas en los equipos rotativos?',
      descripcionAyuda: 'Revisar bandas, poleas, engranes y acoplamientos antes del arranque de turno.',
      sugerenciasMotivoNo: [
        'Guarda lateral con tornillería incompleta',
        'Cubierta de banda transportadora floja',
        'Microswitch de puerta de guarda desajustado',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 302,
      areaId: 3,
      codigo: 'MNT-02',
      categoria: 'Hidráulica y Neumática',
      texto: '¿Las líneas neumáticas e hidráulicas operan a la presión nominal (6 bar) y sin fugas de aire o aceite?',
      descripcionAyuda: 'Verificar unidades FRL (Filtro-Regulador-Lubricador), mangueras y racores.',
      sugerenciasMotivoNo: [
        'Fuga de aire detectada en conector rápido de cilindro',
        'Nivel de aceite bajo en unidad de lubricación FRL',
        'Presión de línea principal por debajo de 5.5 bar',
      ],
      orden: 2,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 303,
      areaId: 3,
      codigo: 'MNT-03',
      categoria: 'Lubricación y Vibración',
      texto: '¿Los motores y reductores principales operan sin ruidos anormales, sobrecalentamiento ni vibración excesiva?',
      descripcionAyuda: 'Comprobar indicadores visuales de nivel de aceite y temperatura de carcasa.',
      sugerenciasMotivoNo: [
        'Vibración inusual en rodamiento de motor principal',
        'Temperatura elevada en caja reductora #3',
        'Mirilla de nivel de lubricante opaca',
      ],
      orden: 3,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 304,
      areaId: 3,
      codigo: 'MNT-04',
      categoria: 'Herramientas y Estación 5S',
      texto: '¿El carro de herramientas y equipo de medición se encuentran completos, calibrados y en su ubicación asignada?',
      descripcionAyuda: 'Verificar tablero de sombras y etiqueta vigente de calibración en torquímetros y multímetros.',
      sugerenciasMotivoNo: [
        'Falta llave dinamométrica en tablero de sombras',
        'Multímetro con fecha de calibración próxima a vencer',
        'Desorden en gaveta de consumibles',
      ],
      orden: 4,
      criticidad: 'MEDIA',
      activo: true,
    },
    {
      id: 305,
      areaId: 3,
      codigo: 'MNT-05',
      categoria: 'Equipo de Protección y LOTO',
      texto: '¿El personal cuenta con su EPP completo y el kit de Bloqueo y Etiquetado (LOTO) está disponible y completo?',
      descripcionAyuda: 'Confirmar candados dieléctricos, tarjetas de bloqueo, casco, gafas y calzado de seguridad.',
      sugerenciasMotivoNo: [
        'Estación LOTO con candados incompletos',
        'Falta reposición de guantes dieléctricos',
        'Tarjeta de bloqueo deteriorada',
      ],
      orden: 5,
      criticidad: 'CRITICA',
      activo: true,
    },
  ];

  // Generar historial realista de checklists (Hoy, últimos 7 días, últimos 30 días y meses previos)
  const checklists: ChecklistRecord[] = [];
  const evidencias: Evidencia[] = [];

  const historicalScenarios: Array<{
    offsetDays: number;
    empIndex: number;
    failedQuestionIds: number[];
    duracion: number;
  }> = [
    // Hoy (offset 0)
    { offsetDays: 0, empIndex: 3, failedQuestionIds: [], duracion: 78 }, // Infraestructura 100%
    { offsetDays: 0, empIndex: 4, failedQuestionIds: [203], duracion: 112 }, // Control 80%
    { offsetDays: 0, empIndex: 5, failedQuestionIds: [302], duracion: 125 }, // Mantenimiento 80%
    { offsetDays: 0, empIndex: 6, failedQuestionIds: [], duracion: 65 }, // Infraestructura 100%
    // Ayer (offset -1)
    { offsetDays: -1, empIndex: 3, failedQuestionIds: [105], duracion: 94 },
    { offsetDays: -1, empIndex: 4, failedQuestionIds: [], duracion: 70 },
    { offsetDays: -1, empIndex: 5, failedQuestionIds: [301, 304], duracion: 145 },
    { offsetDays: -1, empIndex: 8, failedQuestionIds: [], duracion: 82 },
    // Hace 2 días (offset -2)
    { offsetDays: -2, empIndex: 6, failedQuestionIds: [], duracion: 71 },
    { offsetDays: -2, empIndex: 7, failedQuestionIds: [205], duracion: 98 },
    { offsetDays: -2, empIndex: 5, failedQuestionIds: [], duracion: 77 },
    // Hace 3 días (offset -3)
    { offsetDays: -3, empIndex: 0, failedQuestionIds: [], duracion: 64 },
    { offsetDays: -3, empIndex: 1, failedQuestionIds: [202], duracion: 115 },
    { offsetDays: -3, empIndex: 2, failedQuestionIds: [302], duracion: 118 },
    // Hace 4 días (offset -4)
    { offsetDays: -4, empIndex: 3, failedQuestionIds: [103], duracion: 102 },
    { offsetDays: -4, empIndex: 4, failedQuestionIds: [], duracion: 68 },
    { offsetDays: -4, empIndex: 8, failedQuestionIds: [], duracion: 75 },
    // Hace 5 días (offset -5)
    { offsetDays: -5, empIndex: 6, failedQuestionIds: [], duracion: 69 },
    { offsetDays: -5, empIndex: 7, failedQuestionIds: [], duracion: 73 },
    { offsetDays: -5, empIndex: 5, failedQuestionIds: [303], duracion: 110 },
    // Hace 6 días (offset -6)
    { offsetDays: -6, empIndex: 3, failedQuestionIds: [], duracion: 66 },
    { offsetDays: -6, empIndex: 4, failedQuestionIds: [201], duracion: 130 },
    { offsetDays: -6, empIndex: 8, failedQuestionIds: [304], duracion: 105 },
    // Semanas anteriores del mes actual y meses anteriores
    { offsetDays: -10, empIndex: 3, failedQuestionIds: [], duracion: 72 },
    { offsetDays: -11, empIndex: 4, failedQuestionIds: [205], duracion: 96 },
    { offsetDays: -12, empIndex: 5, failedQuestionIds: [302, 304], duracion: 150 },
    { offsetDays: -15, empIndex: 6, failedQuestionIds: [101], duracion: 119 },
    { offsetDays: -18, empIndex: 7, failedQuestionIds: [], duracion: 74 },
    { offsetDays: -22, empIndex: 8, failedQuestionIds: [303], duracion: 108 },
    { offsetDays: -28, empIndex: 3, failedQuestionIds: [], duracion: 68 },
    { offsetDays: -35, empIndex: 4, failedQuestionIds: [203], duracion: 104 },
    { offsetDays: -42, empIndex: 5, failedQuestionIds: [301], duracion: 114 },
    { offsetDays: -50, empIndex: 6, failedQuestionIds: [], duracion: 70 },
    { offsetDays: -65, empIndex: 7, failedQuestionIds: [204], duracion: 121 },
    { offsetDays: -75, empIndex: 8, failedQuestionIds: [302, 305], duracion: 140 },
  ];

  historicalScenarios.forEach((scen, idx) => {
    const emp = empleados[scen.empIndex];
    const fechaOperacion = getLocalISODate(scen.offsetDays);
    const pregArea = preguntas.filter((p) => p.areaId === emp.areaId && p.activo);
    const checklistId = `chk-${1000 + idx}`;
    const folio = `CHK-${fechaOperacion.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() + scen.offsetDays);
    const createdIso = createdDate.toISOString();

    const respuestas: RespuestaItem[] = pregArea.map((p) => {
      const isNo = scen.failedQuestionIds.includes(p.id);
      const respuestaId = `resp-${checklistId}-${p.id}`;
      let evidenciaObj: Evidencia | undefined;

      if (isNo) {
        const dataUrl = createSampleEvidenceSvgDataUrl(
          p.sugerenciasMotivoNo[0] || 'Incidencia detectada en revisión',
          emp.areaNombre,
          fechaOperacion,
          p.codigo
        );
        evidenciaObj = {
          id: `evid-${respuestaId}`,
          respuestaId,
          checklistId,
          nombreArchivo: `evidencia_${p.codigo.toLowerCase()}_${fechaOperacion}.png`,
          formato: 'PNG',
          mimeType: 'image/png',
          tamanoBytes: 48200,
          dataUrl,
          origenCaptura: idx % 2 === 0 ? 'CAMARA' : 'GALERIA',
          createdAt: createdIso,
        };
        evidencias.push(evidenciaObj);
      }

      return {
        id: respuestaId,
        checklistId,
        preguntaId: p.id,
        preguntaCodigo: p.codigo,
        preguntaTexto: p.texto,
        categoria: p.categoria,
        criticidad: p.criticidad,
        respuesta: !isNo,
        motivoNo: isNo
          ? p.sugerenciasMotivoNo[0] || 'Se requiere ajuste correctivo inmediato en punto de inspección.'
          : undefined,
        evidencia: evidenciaObj,
        estadoIncidencia: isNo ? (scen.offsetDays < -7 ? 'RESUELTA' : 'ABIERTA') : 'N/A',
        respondidoEn: createdIso,
      };
    });

    const totalPreguntas = respuestas.length;
    const totalSi = respuestas.filter((r) => r.respuesta).length;
    const totalNo = totalPreguntas - totalSi;
    const porcentajeCumplimiento = Number(((totalSi / totalPreguntas) * 100).toFixed(2));
    const porcentajeIncidencias = Number(((totalNo / totalPreguntas) * 100).toFixed(2));

    checklists.push({
      id: checklistId,
      folio,
      empleadoId: emp.id,
      numeroEmpleado: emp.numeroEmpleado,
      nombreEmpleado: emp.nombreCompleto,
      areaId: emp.areaId,
      areaNombre: emp.areaNombre,
      fechaOperacion,
      totalPreguntas,
      totalSi,
      totalNo,
      porcentajeCumplimiento,
      porcentajeIncidencias,
      duracionSegundos: scen.duracion,
      dispositivo: idx % 3 === 0 ? 'Mobile iOS / Safari' : idx % 3 === 1 ? 'Tablet Android / Chrome' : 'Desktop Windows / Edge',
      observacionesGenerales:
        totalNo > 0
          ? `Se detectaron ${totalNo} incidencia(s) durante el recorrido operativo.`
          : 'Recorrido completado al 100% sin hallazgos negativos.',
      respuestas,
      createdAt: createdIso,
    });
  });

  const estadisticas: EstadisticaRegistro[] = computeConsolidatedStats(checklists, areas);

  const auditoria: AuditLog[] = [
    {
      id: 'aud-1',
      actorIdentificador: '1000 - Oscar Mercado',
      modulo: 'SISTEMA',
      accion: 'INICIALIZACION_BD',
      entidad: 'DatabaseSchema',
      entidadId: 'v1.0',
      detalles: 'Inicialización de áreas base (Infraestructura, Control, Mantenimiento), catálogo de empleados y plantillas de checklist.',
      ipAddress: '127.0.0.1',
      createdAt: nowIso,
    },
  ];

  return {
    roles,
    areas,
    empleados,
    preguntas,
    checklists,
    evidencias,
    estadisticas,
    auditoria,
  };
}

export function computeConsolidatedStats(
  checklists: ChecklistRecord[],
  areas: Area[]
): EstadisticaRegistro[] {
  const today = getLocalISODate(0);
  const nowIso = new Date().toISOString();
  const stats: EstadisticaRegistro[] = [];

  for (const area of areas) {
    const areaChecklists = checklists.filter((c) => c.areaId === area.id && c.fechaOperacion === today);
    const totalResp = areaChecklists.reduce((acc, c) => acc + c.totalPreguntas, 0);
    const totalSi = areaChecklists.reduce((acc, c) => acc + c.totalSi, 0);
    const totalNo = areaChecklists.reduce((acc, c) => acc + c.totalNo, 0);

    stats.push({
      id: `stat-diario-${area.id}-${today}`,
      periodoTipo: 'DIARIO',
      fechaReferencia: today,
      areaId: area.id,
      areaNombre: area.nombre,
      totalChecklists: areaChecklists.length,
      totalRespuestas: totalResp,
      totalSi,
      totalNo,
      porcentajeCumplimiento: totalResp > 0 ? Number(((totalSi / totalResp) * 100).toFixed(2)) : 100,
      porcentajeIncidencias: totalResp > 0 ? Number(((totalNo / totalResp) * 100).toFixed(2)) : 0,
      calculadoEn: nowIso,
    });
  }

  return stats;
}

export function readDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = buildInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    // Asegurar que existan checklists del día actual para que las estadísticas diarias siempre tengan datos frescos en la demo
    const today = getLocalISODate(0);
    const hasToday = parsed.checklists.some((c) => c.fechaOperacion === today);
    if (!hasToday && parsed.checklists.length > 0) {
      // Actualizar fechas relativas si el archivo fue creado otro día
      const fresh = buildInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    return parsed;
  } catch {
    const initial = buildInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export function writeDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  data.estadisticas = computeConsolidatedStats(data.checklists, data.areas);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function registerAudit(
  db: DatabaseSchema,
  params: {
    actorIdentificador: string;
    modulo: string;
    accion: string;
    entidad: string;
    entidadId: string;
    detalles: string;
  }
): void {
  db.auditoria.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorIdentificador: params.actorIdentificador,
    modulo: params.modulo,
    accion: params.accion,
    entidad: params.entidad,
    entidadId: params.entidadId,
    detalles: params.detalles,
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString(),
  });
}
