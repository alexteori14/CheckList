import type { Area, EstadoTiempo } from '@/types';

export const DEFAULT_HORA_INICIO = '07:00';
export const DEFAULT_HORA_FIN = '08:30';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(v: unknown): v is string {
  return typeof v === 'string' && HHMM.test(v);
}

export function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

export function getVentana(area: Pick<Area, 'horaInicio' | 'horaFin'> | undefined | null) {
  const inicio = isValidHHMM(area?.horaInicio) ? area!.horaInicio! : DEFAULT_HORA_INICIO;
  const fin = isValidHHMM(area?.horaFin) ? area!.horaFin! : DEFAULT_HORA_FIN;
  return { inicio, fin };
}

export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type EstadoVentana = 'ANTES' | 'ABIERTA' | 'CERRADA';

/** Estado de la ventana de tiempo de vida de un área en el momento `now` (hoy). */
export function estadoVentana(
  area: Pick<Area, 'horaInicio' | 'horaFin'> | undefined | null,
  now: Date = new Date()
): { estado: EstadoVentana; minutosRestantes: number; minutosParaAbrir: number } {
  const { inicio, fin } = getVentana(area);
  const cur = now.getHours() * 60 + now.getMinutes();
  const ini = hhmmToMinutes(inicio);
  const end = hhmmToMinutes(fin);
  if (cur < ini) return { estado: 'ANTES', minutosRestantes: 0, minutosParaAbrir: ini - cur };
  if (cur <= end) return { estado: 'ABIERTA', minutosRestantes: end - cur, minutosParaAbrir: 0 };
  return { estado: 'CERRADA', minutosRestantes: 0, minutosParaAbrir: 0 };
}

/**
 * Una encuesta está EN_TIEMPO solo si se registró el mismo día de su fecha de operación
 * y dentro de la ventana [horaInicio, horaFin] del área.
 */
export function evaluarTiempo(
  area: Pick<Area, 'horaInicio' | 'horaFin'> | undefined | null,
  fechaOperacion: string,
  createdAt: string
): EstadoTiempo {
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return 'FUERA_DE_TIEMPO';
  if (localISODate(created) !== fechaOperacion) return 'FUERA_DE_TIEMPO';
  const { inicio, fin } = getVentana(area);
  const cur = created.getHours() * 60 + created.getMinutes();
  return cur >= hhmmToMinutes(inicio) && cur <= hhmmToMinutes(fin) ? 'EN_TIEMPO' : 'FUERA_DE_TIEMPO';
}

export function formatMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
