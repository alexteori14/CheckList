export type RoleCode = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR';

export type Criticidad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type ImageFormat = 'JPG' | 'PNG' | 'WEBP';

export type CaptureOrigin = 'CAMARA' | 'GALERIA' | 'DRAG_DROP';

export interface Area {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  colorHex: string;
  icono: string;
  responsable: string;
  activo: boolean;
  /** Tiempo de vida de la encuesta: hora de apertura (HH:MM, 24 h). Por defecto 07:00 */
  horaInicio?: string;
  /** Tiempo de vida de la encuesta: hora de cierre (HH:MM, 24 h). Por defecto 08:30 */
  horaFin?: string;
  createdAt: string;
}

export type EstadoTiempo = 'EN_TIEMPO' | 'FUERA_DE_TIEMPO';

export interface Empleado {
  id: string;
  numeroEmpleado: string;
  nombreCompleto: string;
  correo?: string;
  puesto?: string;
  areaId: number;
  areaNombre: string;
  areaIdSecundaria?: number | null;
  areaNombreSecundaria?: string | null;
  activo: boolean;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pregunta {
  id: number;
  areaId: number;
  codigo: string;
  categoria: string;
  texto: string;
  descripcionAyuda: string;
  sugerenciasMotivoNo: string[];
  orden: number;
  criticidad: Criticidad;
  activo: boolean;
}

export interface Evidencia {
  id: string;
  respuestaId: string;
  checklistId: string;
  nombreArchivo: string;
  formato: ImageFormat;
  mimeType: string;
  tamanoBytes: number;
  dataUrl: string; // Base64 o URL en Azure Blob Storage
  origenCaptura: CaptureOrigin;
  createdAt: string;
}

export interface RespuestaItem {
  id: string;
  checklistId: string;
  preguntaId: number;
  preguntaCodigo: string;
  preguntaTexto: string;
  categoria: string;
  criticidad: Criticidad;
  respuesta: boolean; // true = Sí (✅), false = No (❌)
  motivoNo?: string;
  evidencia?: Evidencia;
  estadoIncidencia: 'N/A' | 'ABIERTA' | 'EN_ATENCION' | 'RESUELTA';
  respondidoEn: string;
}

export interface ChecklistRecord {
  id: string;
  folio: string;
  empleadoId: string;
  numeroEmpleado: string;
  nombreEmpleado: string;
  areaId: number;
  areaNombre: string;
  fechaOperacion: string; // YYYY-MM-DD
  totalPreguntas: number;
  totalSi: number;
  totalNo: number;
  porcentajeCumplimiento: number;
  porcentajeIncidencias: number;
  duracionSegundos: number;
  dispositivo: string;
  observacionesGenerales?: string;
  respuestas: RespuestaItem[];
  /** Si se contestó dentro del tiempo de vida del área */
  estadoTiempo?: EstadoTiempo;
  /** Hora local de registro (HH:MM) */
  horaRegistro?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorIdentificador: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalles: string;
  ipAddress: string;
  createdAt: string;
}

export interface EstadisticaRegistro {
  id: string;
  periodoTipo: 'DIARIO' | 'SEMANAL' | 'MENSUAL';
  fechaReferencia: string;
  areaId: number | null;
  areaNombre: string;
  totalChecklists: number;
  totalRespuestas: number;
  totalSi: number;
  totalNo: number;
  porcentajeCumplimiento: number;
  porcentajeIncidencias: number;
  calculadoEn: string;
}

export interface DatabaseSchema {
  areas: Area[];
  empleados: Empleado[];
  preguntas: Pregunta[];
  checklists: ChecklistRecord[];
  evidencias: Evidencia[];
  estadisticas: EstadisticaRegistro[];
  auditoria: AuditLog[];
}
