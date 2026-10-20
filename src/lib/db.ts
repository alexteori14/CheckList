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
import { DEFAULT_HORA_FIN, DEFAULT_HORA_INICIO, evaluarTiempo, localHHMM } from './schedule';

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
      codigo: 'MES',
      nombre: 'MES',
      descripcion: 'Sistemas de ejecución de manufactura, trazabilidad de piezas, control de órdenes y OEE.',
      colorHex: '#0284C7',
      icono: 'Cpu',
      responsable: 'Ing. Roberto Méndez',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 2,
      codigo: 'IND4',
      nombre: 'Ind. 4.0',
      descripcion: 'Tecnologías de Industria 4.0, telemetría IoT, edge computing, visión artificial y análisis de datos.',
      colorHex: '#7C3AED',
      icono: 'Radio',
      responsable: 'Ing. Laura Gómez',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 3,
      codigo: 'INFRA',
      nombre: 'Infraestructura',
      descripcion: 'Centros de datos, telecomunicaciones, energía ininterrumpida (UPS), switches y climatización.',
      colorHex: '#2563EB',
      icono: 'Server',
      responsable: 'Ing. Carlos Villarreal',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 4,
      codigo: 'STAFF',
      nombre: 'Staff IT',
      descripcion: 'Soporte corporativo a usuarios, gestión de identidades, licencias, ciberseguridad y estaciones de trabajo.',
      colorHex: '#0D9488',
      icono: 'Users',
      responsable: 'Lic. Fernando Castillo',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 5,
      codigo: 'DIGIT',
      nombre: 'Digitalizacion',
      descripcion: 'Automatización de procesos digitales, flujos de trabajo sin papel, portales web e integraciones.',
      colorHex: '#D97706',
      icono: 'Smartphone',
      responsable: 'Ing. Sofía Hernández',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 6,
      codigo: 'SAP',
      nombre: 'SAP',
      descripcion: 'ERP SAP corporativo, módulos productivos, interfaces RFC/IDoc y gestión de inventarios.',
      colorHex: '#4F46E5',
      icono: 'Database',
      responsable: 'Ing. Valeria Ramírez',
      activo: true,
      createdAt: nowIso,
    },
    {
      id: 7,
      codigo: 'SOPMAN',
      nombre: 'Soporte Manufactura',
      descripcion: 'Soporte técnico directo en líneas de ensamble, computadoras industriales y bancos de prueba.',
      colorHex: '#E11D48',
      icono: 'Wrench',
      responsable: 'Ing. Miguel Ángel Torres',
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
      areaId: 3,
      areaNombre: 'Infraestructura',
      areaIdSecundaria: 4,
      areaNombreSecundaria: 'Staff IT',
      rolCodigo: 'ADMIN',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'emp-2001',
      numeroEmpleado: '2001',
      nombreCompleto: 'Alejandro Puente',
      correo: 'puentealejandro491@gmail.com',
      puesto: 'Especialista en Infraestructura y Tecnologías 4.0',
      areaId: 3,
      areaNombre: 'Infraestructura',
      areaIdSecundaria: 2,
      areaNombreSecundaria: 'Ind. 4.0',
      rolCodigo: 'OPERADOR',
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
      puesto: 'Jefe de Sistemas MES',
      areaId: 1,
      areaNombre: 'MES',
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
      puesto: 'Jefa de Industria 4.0',
      areaId: 2,
      areaNombre: 'Ind. 4.0',
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
      puesto: 'Jefe de Infraestructura',
      areaId: 3,
      areaNombre: 'Infraestructura',
      rolCodigo: 'SUPERVISOR',
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
      puesto: 'Ingeniera de Digitalización y Automatización',
      areaId: 5,
      areaNombre: 'Digitalizacion',
      areaIdSecundaria: 1,
      areaNombreSecundaria: 'MES',
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
      puesto: 'Ingeniero de Soporte a Manufactura',
      areaId: 7,
      areaNombre: 'Soporte Manufactura',
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
      puesto: 'Especialista en Módulos SAP',
      areaId: 6,
      areaNombre: 'SAP',
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
      puesto: 'Líder de Mesa de Ayuda Staff IT',
      areaId: 4,
      areaNombre: 'Staff IT',
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
      puesto: 'Técnica de Soporte y Conectividad',
      areaId: 7,
      areaNombre: 'Soporte Manufactura',
      areaIdSecundaria: 6,
      areaNombreSecundaria: 'SAP',
      rolCodigo: 'OPERADOR',
      activo: true,
      passwordHash: defaultAdminPass,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const preguntas: Pregunta[] = [
    // 1. MES (areaId = 1)
    {
      id: 101,
      areaId: 1,
      codigo: 'MES-01',
      categoria: 'Conectividad y Terminales',
      texto: '¿Las terminales de captura en piso de planta y escáneres de código de barras tienen enlace activo con el servidor MES?',
      descripcionAyuda: 'Comprobar que las estaciones de trabajo no muestren error de socket o desconexión del middleware.',
      sugerenciasMotivoNo: [
        'Terminal de captura #3 con pérdida de enlace con el servidor MES',
        'Lector de código 2D inalámbrico desincronizado en línea 1',
        'Retardo mayor a 4 segundos en lectura de etiquetas de lote',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 102,
      areaId: 1,
      codigo: 'MES-02',
      categoria: 'Cálculo de OEE y Producción',
      texto: '¿El cálculo del indicador OEE (Disponibilidad, Rendimiento, Calidad) se actualiza en tiempo real sin desfase de órdenes?',
      descripcionAyuda: 'Validar panel Andon principal comparado con el conteo de piezas reales producidas.',
      sugerenciasMotivoNo: [
        'Desfase de 15 minutos en el reporte de piezas buenas vs sistema',
        'Contador de scrap no refleja piezas rechazadas del turno',
        'Paro no programado sin registrar código de causa en HMI',
      ],
      orden: 2,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 103,
      areaId: 1,
      codigo: 'MES-03',
      categoria: 'Recetas y Parámetros',
      texto: '¿Las recetas de manufactura y especificaciones de ensamble corresponden exactamente al número de parte en proceso?',
      descripcionAyuda: 'Corroborar versión de receta aprobada en ingeniería contra la cargada en máquina.',
      sugerenciasMotivoNo: [
        'Versión de receta desactualizada en celda de remachado',
        'Parámetros de temperatura fuera de la tolerancia autorizada',
        'Falta confirmación de liberación de ingeniería para nuevo lote',
      ],
      orden: 3,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 104,
      areaId: 1,
      codigo: 'MES-04',
      categoria: 'Bloqueos de Calidad y Trazabilidad',
      texto: '¿Los bloqueos automáticos por piezas no conformes (Scrap / Rework) responden sin permitir avance de lote defectuoso?',
      descripcionAyuda: 'Realizar prueba de bloqueo con pieza patrón de rechazo conocida (Golden Sample).',
      sugerenciasMotivoNo: [
        'La compuerta de desvío no expulsó pieza no conforme',
        'Falla en sensor de confirmación de descarte',
        'Registro de trazabilidad serial incompleto en estación final',
      ],
      orden: 4,
      criticidad: 'CRITICA',
      activo: true,
    },

    // 2. IND. 4.0 (areaId = 2)
    {
      id: 201,
      areaId: 2,
      codigo: 'IND-01',
      categoria: 'Gateways y Nodos Edge',
      texto: '¿Las puertas de enlace (Edge Gateways) y concentradores IoT operan en línea y transmiten telemetría sin pérdida de paquetes?',
      descripcionAyuda: 'Revisar status LED en gateways industriales y broker MQTT en la nube.',
      sugerenciasMotivoNo: [
        'Edge Gateway de nave 2 desconectado de la red OT',
        'Colas de mensajes MQTT acumuladas por latencia en el broker',
        'Reinicio esporádico de concentrador de señales analógicas',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 202,
      areaId: 2,
      codigo: 'IND-02',
      categoria: 'Visión Artificial',
      texto: '¿Las cámaras inteligentes y algoritmos de visión artificial clasifican ensambles correctamente sin falsos rechazos excesivos?',
      descripcionAyuda: 'Inspeccionar iluminación estroboscópica y limpieza de lentes ópticos.',
      sugerenciasMotivoNo: [
        'Iluminación LED con fluctuación de brillo causando falsos rechazos',
        'Lente de cámara con suciedad o residuo de aceite',
        'Índice de falsos positivos superior al 3% en celda de ensamble',
      ],
      orden: 2,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 203,
      areaId: 2,
      codigo: 'IND-03',
      categoria: 'Conectividad Inalámbrica IoT',
      texto: '¿La red inalámbrica industrial (Wi-Fi 6 / LoRaWAN) en celdas robotizadas mantiene latencia inferior a 20 ms?',
      descripcionAyuda: 'Comprobar medidor de intensidad RSSI y ausencia de fuentes de interferencia electromagnética.',
      sugerenciasMotivoNo: [
        'Interferencia por arco eléctrico degradando señal en celda de soldadura',
        'Access point industrial reporta alta tasa de retransmisiones',
        'Sensor IoT de temperatura con batería baja (< 15%)',
      ],
      orden: 3,
      criticidad: 'MEDIA',
      activo: true,
    },
    {
      id: 204,
      areaId: 2,
      codigo: 'IND-04',
      categoria: 'Mantenimiento Predictivo',
      texto: '¿Los sensores de vibración y termografía en motores críticos reportan valores normales dentro de los umbrales de alerta?',
      descripcionAyuda: 'Verificar dashboard de salud de activos (análisis espectral y envolvente de aceleración).',
      sugerenciasMotivoNo: [
        'Sensor de vibración en motor principal supera umbral de advertencia',
        'Termografía detecta punto caliente (> 75°C) en caja de bornes',
        'Sensor piezoeléctrico desconectado físicamente del soporte',
      ],
      orden: 4,
      criticidad: 'ALTA',
      activo: true,
    },

    // 3. INFRAESTRUCTURA (areaId = 3)
    {
      id: 301,
      areaId: 3,
      codigo: 'INF-01',
      categoria: 'Climatización de Site',
      texto: '¿La temperatura (18°C - 23°C) y humedad relativa del Centro de Datos se encuentran en rango óptimo sin alarmas en unidades HVAC?',
      descripcionAyuda: 'Verificar termómetro digital del pasillo frío y estado de unidades HVAC sin códigos de alarma.',
      sugerenciasMotivoNo: [
        'Temperatura superior a 24°C en pasillo frío',
        'Falla en unidad de aire acondicionado de precisión #2',
        'Humedad fuera de rango permitido',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 302,
      areaId: 3,
      codigo: 'INF-02',
      categoria: 'Energía Ininterrumpida',
      texto: '¿Los sistemas UPS y bancos de baterías operan en línea normal sin alarmas y con capacidad de respaldo superior al 95%?',
      descripcionAyuda: 'Confirmar en el panel frontal del UPS ausencia de indicadores en ámbar o rojo.',
      sugerenciasMotivoNo: [
        'Alerta de batería en reemplazo en UPS principal',
        'Variación de voltaje en línea de entrada de transformador',
        'UPS operando en modo Bypass por sobrecarga temporal',
      ],
      orden: 2,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 303,
      areaId: 3,
      codigo: 'INF-03',
      categoria: 'Switches y Racks',
      texto: '¿Los gabinetes de comunicaciones tienen patch cords ordenados, cerraduras seguras y switches sin puertos en error?',
      descripcionAyuda: 'Inspeccionar visualmente patch panels, organizadores verticales y LEDs de estado.',
      sugerenciasMotivoNo: [
        'Cables de parcheo sueltos o sin etiquetar en IDF 3',
        'Puerta de rack sin seguro en pasillo secundario',
        'Switch con alerta de puerto caído (link down)',
      ],
      orden: 3,
      criticidad: 'MEDIA',
      activo: true,
    },
    {
      id: 304,
      areaId: 3,
      codigo: 'INF-04',
      categoria: 'Seguridad Física y CCTV',
      texto: '¿El lector biométrico de acceso al site, cámaras perimetrales y sistema de supresión de incendios operan normalmente?',
      descripcionAyuda: 'Validar que la cerradura electromagnética cierre al 100% y el panel de detección esté en verde.',
      sugerenciasMotivoNo: [
        'Lector biométrico no reconoce huella de operadores autorizados',
        'Cámara de acceso con ángulo desviado o imagen borrosa',
        'Sensor de humo reporta mantenimiento requerido en zona 1',
      ],
      orden: 4,
      criticidad: 'ALTA',
      activo: true,
    },

    // 4. STAFF IT (areaId = 4)
    {
      id: 401,
      areaId: 4,
      codigo: 'STF-01',
      categoria: 'Ciberseguridad y Endpoint',
      texto: '¿Los equipos de cómputo de usuarios tienen el agente EDR/antivirus activo, definiciones actualizadas y disco cifrado?',
      descripcionAyuda: 'Revisar consola central de Endpoint Protection y reporte de cumplimiento de BitLocker.',
      sugerenciasMotivoNo: [
        'Equipo administrativo sin actualización de firmas de antivirus',
        'Cifrado BitLocker suspendido en laptop de compras',
        'Agente EDR en estado deshabilitado por el usuario',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 402,
      areaId: 4,
      codigo: 'STF-02',
      categoria: 'Directorio Activo y Accesos',
      texto: '¿Las solicitudes de altas, bajas y cambios de permisos en Directorio Activo y correo corporativo se encuentran atendidas y al día?',
      descripcionAyuda: 'Validar tickets de desvinculación de personal con cuenta revocada en menos de 1 hora.',
      sugerenciasMotivoNo: [
        'Cuenta de ex-empleado con baja pendiente en Active Directory',
        'Ticket de solicitud de acceso a carpeta compartida fuera de SLA',
        'Usuario bloqueado por intentos fallidos de autenticación MFA',
      ],
      orden: 2,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 403,
      areaId: 4,
      codigo: 'STF-03',
      categoria: 'Respaldos Corporativos',
      texto: '¿Los respaldos automáticos de perfiles y carpetas compartidas de red de usuarios clave se completaron satisfactoriamente?',
      descripcionAyuda: 'Comprobar bitácora de respaldo en almacenamiento NAS/OneDrive corporativo.',
      sugerenciasMotivoNo: [
        'Error de sincronización de respaldo en equipo de finanzas',
        'Capacidad de almacenamiento de respaldos al 92% en servidor de archivos',
        'Agente de copia de seguridad no inició en estación de gerencia',
      ],
      orden: 3,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 404,
      areaId: 4,
      codigo: 'STF-04',
      categoria: 'Equipamiento y Mesa de Ayuda',
      texto: '¿El stock de contingencia de laptops, cargadores, monitores y periféricos se encuentra inventariado y listo para préstamo?',
      descripcionAyuda: 'Confirmar al menos 3 equipos configurados con imagen corporativa en el site de Staff IT.',
      sugerenciasMotivoNo: [
        'Sin laptops de contingencia disponibles para préstamo inmediato',
        'Faltan cargadores de 65W tipo C en el stock de repuestos',
        'Equipo en devolución sin formateo de seguridad aplicado',
      ],
      orden: 4,
      criticidad: 'BAJA',
      activo: true,
    },

    // 5. DIGITALIZACION (areaId = 5)
    {
      id: 501,
      areaId: 5,
      codigo: 'DIG-01',
      categoria: 'Portales y Formularios Web',
      texto: '¿Los portales web internos y formularios digitales operan con certificados SSL vigentes y tiempos de carga menores a 2 s?',
      descripcionAyuda: 'Verificar navegación en HTTPS y ausencia de advertencias de seguridad en navegadores.',
      sugerenciasMotivoNo: [
        'Certificado SSL próximo a vencer en portal de reportes internos',
        'Tiempo de carga superior a 4 segundos en formulario de solicitudes',
        'Error 502 Bad Gateway intermitente en portal de proveedores',
      ],
      orden: 1,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 502,
      areaId: 5,
      codigo: 'DIG-02',
      categoria: 'Flujos sin Papel y Firma Digital',
      texto: '¿Los motores de flujos de aprobación y firma electrónica procesan documentos sin solicitudes atascadas?',
      descripcionAyuda: 'Revisar cola de procesos del sistema de firmas y notificaciones por correo.',
      sugerenciasMotivoNo: [
        'Flujo de aprobación de compras detenido por destinatario ausente',
        'Servicio de firma digital rechazó certificado por expiración',
        'Notificación de documento firmado no fue enviada al solicitante',
      ],
      orden: 2,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 503,
      areaId: 5,
      codigo: 'DIG-03',
      categoria: 'Automatización RPA y APIs',
      texto: '¿Los bots de automatización (RPA) y microservicios de sincronización de datos ejecutaron sus tareas programadas sin caídas?',
      descripcionAyuda: 'Inspeccionar consola de orquestación de bots y tasa de transacciones fallidas.',
      sugerenciasMotivoNo: [
        'Bot de extracción de reportes fiscales falló por cambio en la UI origen',
        'API de sincronización reportó error 429 por límite de peticiones',
        'Proceso batch de consolidación tardó más del tiempo asignado',
      ],
      orden: 3,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 504,
      areaId: 5,
      codigo: 'DIG-04',
      categoria: 'Repositorio Documental',
      texto: '¿El gestor documental en la nube mantiene sincronización activa de permisos y versiones aprobadas de procedimientos?',
      descripcionAyuda: 'Comprobar control de versiones e integridad de carpetas por departamento.',
      sugerenciasMotivoNo: [
        'Carpeta de procedimientos operativos con enlace roto en la intranet',
        'Permiso de edición indebido detectado en carpeta de auditorías',
        'Conflicto de versiones en archivo maestro de control de cambios',
      ],
      orden: 4,
      criticidad: 'MEDIA',
      activo: true,
    },

    // 6. SAP (areaId = 6)
    {
      id: 601,
      areaId: 6,
      codigo: 'SAP-01',
      categoria: 'Interfaces RFC e IDocs',
      texto: '¿Las interfaces entre SAP ERP y los sistemas de planta operan sin IDocs en estado de error (status 51 / 64)?',
      descripcionAyuda: 'Monitorear transacción BD87 o WE02 en SAP para verificar transmisión de órdenes y consumos.',
      sugerenciasMotivoNo: [
        'IDoc de notificación de producción en status 51 por material bloqueado',
        'Falla de enlace RFC con el servidor intermedio de piso',
        'Acumulación de más de 20 IDocs pendientes de procesamiento',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 602,
      areaId: 6,
      codigo: 'SAP-02',
      categoria: 'Rendimiento SAP HANA',
      texto: '¿Los servidores de aplicación SAP y la base de datos SAP HANA mantienen consumo de memoria y CPU dentro de los parámetros?',
      descripcionAyuda: 'Revisar transacción ST03N y memoria usada en SAP HANA Studio.',
      sugerenciasMotivoNo: [
        'Uso de memoria superior al 88% en nodo principal de HANA',
        'Tiempo de respuesta de diálogo promedio superior a 1200 ms',
        'Dump de sistema (ST22) detectado en proceso de liquidación',
      ],
      orden: 2,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 603,
      areaId: 6,
      codigo: 'SAP-03',
      categoria: 'Impresión y Spool de Almacén',
      texto: '¿Los servidores de spool de SAP imprimen correctamente en impresoras térmicas de almacén y líneas de empaque?',
      descripcionAyuda: 'Verificar transacción SP01 comprobando que no existan órdenes de spool con estatus Error.',
      sugerenciasMotivoNo: [
        'Impresora térmica de etiquetas de producto sin papel en almacén central',
        'Orden de spool bloqueada por puerto de red no disponible',
        'Alineación incorrecta del código de barras en formato ZPL',
      ],
      orden: 3,
      criticidad: 'ALTA',
      activo: true,
    },
    {
      id: 604,
      areaId: 6,
      codigo: 'SAP-04',
      categoria: 'Jobs Productivos Nocturnos',
      texto: '¿Los procesos de fondo (background jobs) de cierre de inventario y reconciliación contable finalizaron con status Finished?',
      descripcionAyuda: 'Consultar transacción SM37 para verificar jobs de medianoche sin estatus Canceled.',
      sugerenciasMotivoNo: [
        'Job de actualización de costos cancelado por bloqueo de registro',
        'Proceso de recálculo de stock de seguridad duró 3 horas más de lo habitual',
        'Falta confirmación de finalización de job de interfaces contables',
      ],
      orden: 4,
      criticidad: 'ALTA',
      activo: true,
    },

    // 7. SOPORTE MANUFACTURA (areaId = 7)
    {
      id: 701,
      areaId: 7,
      codigo: 'MAN-01',
      categoria: 'Terminales Industriales IPC',
      texto: '¿Las computadoras industriales táctiles en estaciones de ensamble operan de manera continua sin reinicios ni bloqueos?',
      descripcionAyuda: 'Revisar visor de eventos de Windows y temperatura de gabinetes sellados NEMA.',
      sugerenciasMotivoNo: [
        'Pantalla táctil con calibración desviada en estación de ensamble #4',
        'Reinicio inesperado de computadora industrial por sobrecalentamiento',
        'Vidrio protector de pantalla táctil fisurado por impacto accidental',
      ],
      orden: 1,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 702,
      areaId: 7,
      codigo: 'MAN-02',
      categoria: 'Bancos de Prueba y Sensores DPM',
      texto: '¿Los equipos de prueba funcional y lectores DPM transmiten resultados válidos a la base de datos de calidad?',
      descripcionAyuda: 'Validar lazo serie/Ethernet hacia el controlador del banco de pruebas.',
      sugerenciasMotivoNo: [
        'Lector DPM láser no reconoce código de grabado láser en metal',
        'Pérdida de comunicación entre banco de pruebas y software de calidad',
        'Conector DB9 con pines flojos en estación de prueba eléctrica',
      ],
      orden: 2,
      criticidad: 'CRITICA',
      activo: true,
    },
    {
      id: 703,
      areaId: 7,
      codigo: 'MAN-03',
      categoria: 'Canalización y Cableado en Piso',
      texto: '¿Las tomas de energía regulada y cableado de datos en puestos de trabajo están debidamente canalizados sin riesgo de tropiezo?',
      descripcionAyuda: 'Inspeccionar canaletas de aluminio, mallas protectoras y tubos conduit.',
      sugerenciasMotivoNo: [
        'Cable de red expuesto sobre el piso sin canaleta de protección',
        'Toma de corriente regulada floja en banco de trabajo #2',
        'Tapa de registro eléctrico en piso abierta o rota',
      ],
      orden: 3,
      criticidad: 'MEDIA',
      activo: true,
    },
    {
      id: 704,
      areaId: 7,
      codigo: 'MAN-04',
      categoria: 'Refacciones Críticas de IT en Planta',
      texto: '¿El kit de emergencia en piso de manufactura (escáneres de repuesto, switches industriales, cables) se encuentra completo?',
      descripcionAyuda: 'Verificar gabinete de refacciones de IT de respuesta rápida en planta.',
      sugerenciasMotivoNo: [
        'Falta escáner de repuesto en el armario de contingencia de planta',
        'No hay cables de red de 5 metros preparados con conectores RJ45',
        'Fuente de poder de 24V DC de respaldo prestada sin reposición',
      ],
      orden: 4,
      criticidad: 'ALTA',
      activo: true,
    },
  ];

  // Generar historial realista de checklists en las 7 áreas
  const checklists: ChecklistRecord[] = [];
  const evidencias: Evidencia[] = [];

  const historicalScenarios: Array<{
    offsetDays: number;
    empIndex: number;
    areaIdOverride?: number;
    failedQuestionIds: number[];
    duracion: number;
  }> = [
    // Hoy (offset 0) - Distribución en las 7 áreas
    { offsetDays: 0, empIndex: 1, areaIdOverride: 3, failedQuestionIds: [], duracion: 65 }, // Alejandro Puente -> Infraestructura (100%)
    { offsetDays: 0, empIndex: 1, areaIdOverride: 2, failedQuestionIds: [202], duracion: 110 }, // Alejandro Puente -> Ind. 4.0 (Visión artificial)
    { offsetDays: 0, empIndex: 2, failedQuestionIds: [], duracion: 72 }, // Roberto Méndez -> MES (100%)
    { offsetDays: 0, empIndex: 3, failedQuestionIds: [201], duracion: 118 }, // Laura Gómez -> Ind. 4.0 (Edge gateway)
    { offsetDays: 0, empIndex: 6, failedQuestionIds: [701], duracion: 125 }, // Miguel Ángel Torres -> Soporte Manufactura
    { offsetDays: 0, empIndex: 7, failedQuestionIds: [], duracion: 68 }, // Valeria Ramírez -> SAP (100%)
    { offsetDays: 0, empIndex: 8, failedQuestionIds: [401], duracion: 95 }, // Fernando Castillo -> Staff IT (Antivirus)
    { offsetDays: 0, empIndex: 5, failedQuestionIds: [], duracion: 75 }, // Sofía Hernández -> Digitalizacion (100%)

    // Ayer (offset -1)
    { offsetDays: -1, empIndex: 1, areaIdOverride: 3, failedQuestionIds: [303], duracion: 98 }, // Alejandro Puente -> Infraestructura
    { offsetDays: -1, empIndex: 2, failedQuestionIds: [101], duracion: 105 }, // MES
    { offsetDays: -1, empIndex: 7, failedQuestionIds: [601], duracion: 130 }, // SAP (IDoc 51)
    { offsetDays: -1, empIndex: 9, failedQuestionIds: [], duracion: 60 }, // Soporte Manufactura
    { offsetDays: -1, empIndex: 5, failedQuestionIds: [502], duracion: 112 }, // Digitalizacion

    // Hace 2 días (offset -2)
    { offsetDays: -2, empIndex: 3, failedQuestionIds: [], duracion: 70 }, // Ind. 4.0
    { offsetDays: -2, empIndex: 8, failedQuestionIds: [], duracion: 64 }, // Staff IT
    { offsetDays: -2, empIndex: 6, failedQuestionIds: [702], duracion: 122 }, // Soporte Manufactura
    { offsetDays: -2, empIndex: 7, failedQuestionIds: [], duracion: 73 }, // SAP

    // Hace 3 días (offset -3)
    { offsetDays: -3, empIndex: 0, areaIdOverride: 3, failedQuestionIds: [], duracion: 62 }, // Oscar Mercado -> Infraestructura
    { offsetDays: -3, empIndex: 1, areaIdOverride: 2, failedQuestionIds: [], duracion: 69 }, // Alejandro Puente -> Ind. 4.0
    { offsetDays: -3, empIndex: 2, failedQuestionIds: [104], duracion: 140 }, // MES
    { offsetDays: -3, empIndex: 4, failedQuestionIds: [], duracion: 71 }, // Carlos Villarreal -> Infraestructura

    // Hace 4 días (offset -4)
    { offsetDays: -4, empIndex: 8, failedQuestionIds: [403], duracion: 115 }, // Staff IT
    { offsetDays: -4, empIndex: 5, failedQuestionIds: [], duracion: 78 }, // Digitalizacion
    { offsetDays: -4, empIndex: 7, failedQuestionIds: [603], duracion: 104 }, // SAP
    { offsetDays: -4, empIndex: 6, failedQuestionIds: [], duracion: 67 }, // Soporte Manufactura

    // Hace 5 días (offset -5)
    { offsetDays: -5, empIndex: 1, areaIdOverride: 3, failedQuestionIds: [], duracion: 66 }, // Alejandro Puente -> Infraestructura
    { offsetDays: -5, empIndex: 3, failedQuestionIds: [204], duracion: 120 }, // Ind. 4.0
    { offsetDays: -5, empIndex: 2, failedQuestionIds: [], duracion: 74 }, // MES

    // Histórico de semanas anteriores
    { offsetDays: -7, empIndex: 5, failedQuestionIds: [501], duracion: 118 }, // Digitalizacion
    { offsetDays: -9, empIndex: 7, failedQuestionIds: [], duracion: 70 }, // SAP
    { offsetDays: -12, empIndex: 6, failedQuestionIds: [701], duracion: 112 }, // Soporte Manufactura
    { offsetDays: -15, empIndex: 8, failedQuestionIds: [], duracion: 65 }, // Staff IT
    { offsetDays: -18, empIndex: 1, areaIdOverride: 2, failedQuestionIds: [202], duracion: 125 }, // Ind. 4.0
    { offsetDays: -22, empIndex: 2, failedQuestionIds: [102], duracion: 108 }, // MES
    { offsetDays: -28, empIndex: 4, failedQuestionIds: [], duracion: 73 }, // Infraestructura
    { offsetDays: -35, empIndex: 7, failedQuestionIds: [602], duracion: 135 }, // SAP
    { offsetDays: -45, empIndex: 6, failedQuestionIds: [], duracion: 69 }, // Soporte Manufactura
  ];

  historicalScenarios.forEach((scen, idx) => {
    const emp = empleados[scen.empIndex];
    const targetAreaId = scen.areaIdOverride || emp.areaId;
    const targetArea = areas.find((a) => a.id === targetAreaId) || areas[0];
    const fechaOperacion = getLocalISODate(scen.offsetDays);
    const pregArea = preguntas.filter((p) => p.areaId === targetArea.id && p.activo);
    const checklistId = `chk-${1000 + idx}`;
    const folio = `CHK-${fechaOperacion.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() + scen.offsetDays);
    // Hora de captura simulada: la mayoría dentro del tiempo de vida (07:00-08:30), algunas tardías
    if (idx % 4 === 3) {
      createdDate.setHours(9, 10 + (idx % 40), 0, 0);
    } else {
      createdDate.setHours(7, (idx * 7) % 80, 0, 0);
    }
    const createdIso = createdDate.toISOString();
    const estadoTiempoSeed = evaluarTiempo(
      { horaInicio: DEFAULT_HORA_INICIO, horaFin: DEFAULT_HORA_FIN },
      fechaOperacion,
      createdIso
    );

    const respuestas: RespuestaItem[] = pregArea.map((p) => {
      const isNo = scen.failedQuestionIds.includes(p.id);
      const respuestaId = `resp-${checklistId}-${p.id}`;
      let evidenciaObj: Evidencia | undefined;

      if (isNo) {
        const dataUrl = createSampleEvidenceSvgDataUrl(
          p.sugerenciasMotivoNo[0] || 'Incidencia detectada en revisión',
          targetArea.nombre,
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
      areaId: targetArea.id,
      areaNombre: targetArea.nombre,
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
      estadoTiempo: estadoTiempoSeed,
      horaRegistro: localHHMM(createdDate),
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
    areas: areas.map((a) => ({
      ...a,
      horaInicio: a.horaInicio || DEFAULT_HORA_INICIO,
      horaFin: a.horaFin || DEFAULT_HORA_FIN,
    })),
    empleados,
    preguntas,
    checklists,
    evidencias,
    estadisticas,
    auditoria,
    notificaciones: [],
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
      // Conservar la configuración del administrador (tiempo de vida por área) y la bitácora de correos
      fresh.areas.forEach((a) => {
        const prev = parsed.areas.find((p) => p.id === a.id);
        if (prev) {
          a.horaInicio = prev.horaInicio || a.horaInicio;
          a.horaFin = prev.horaFin || a.horaFin;
        }
      });
      fresh.notificaciones = parsed.notificaciones || [];
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    if (!parsed.notificaciones) parsed.notificaciones = [];
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
