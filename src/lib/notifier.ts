import nodemailer from 'nodemailer';
import { getLocalISODate, readDb, registerAudit, writeDb } from './db';
import { estadoVentana, getVentana } from './schedule';
import type { Area, DatabaseSchema, Empleado, NotificacionCorreo } from '@/types';

const REINTENTO_MINUTOS = 10;

export function mailConfigurado(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/** Si MAIL_SOLO_DESTINATARIOS está definido, solo se envían correos a esas direcciones (modo pruebas). */
function destinatarioPermitido(correo: string): boolean {
  const lista = (process.env.MAIL_SOLO_DESTINATARIOS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return lista.length === 0 || lista.includes(correo.trim().toLowerCase());
}

export async function enviarCorreo(
  to: string,
  subject: string,
  html: string
): Promise<{ estado: 'ENVIADO' | 'ERROR' | 'SIN_CONFIGURAR'; detalle?: string }> {
  if (!mailConfigurado()) {
    return {
      estado: 'SIN_CONFIGURAR',
      detalle: 'Faltan SMTP_USER / SMTP_PASS en .env.local. Configura la cuenta remitente para enviar correos reales.',
    };
  }
  try {
    const info = await getTransport().sendMail({
      from: process.env.MAIL_FROM || `SmartCheck <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { estado: 'ENVIADO', detalle: info.messageId };
  } catch (e) {
    return { estado: 'ERROR', detalle: e instanceof Error ? e.message : String(e) };
  }
}

function htmlVencida(emp: Empleado, areas: Area[], fecha: string): string {
  const filas = areas
    .map((a) => {
      const v = getVentana(a);
      return `<li><strong>${a.nombre}</strong> — horario permitido ${v.inicio} a ${v.fin}</li>`;
    })
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#0f172a;color:#fff;padding:16px 20px"><h2 style="margin:0;font-size:18px">SmartCheck · Encuesta no contestada</h2></div>
  <div style="padding:20px;color:#0f172a;font-size:14px;line-height:1.5">
    <p>Hola <strong>${emp.nombreCompleto}</strong>,</p>
    <p>Tu encuesta del <strong>${fecha}</strong> no fue contestada dentro de su tiempo de vida:</p>
    <ul>${filas}</ul>
    <p>Por favor ingresa a SmartCheck y repórtalo con tu supervisor. Si ya la contestaste, ignora este mensaje.</p>
  </div></div>`;
}

export interface PendienteEncuesta {
  empleado: Empleado;
  area: Area;
}

/** Empleados activos (no administradores) que no contestaron hoy la encuesta de un área cuya ventana ya cerró. */
export function obtenerPendientesVencidos(db: DatabaseSchema, now = new Date()): PendienteEncuesta[] {
  const hoy = getLocalISODate(0);
  const res: PendienteEncuesta[] = [];
  for (const area of db.areas) {
    if (estadoVentana(area, now).estado !== 'CERRADA') continue;
    for (const emp of db.empleados) {
      if (!emp.activo || emp.rolCodigo === 'ADMIN') continue;
      if (emp.areaId !== area.id && emp.areaIdSecundaria !== area.id) continue;
      const contesto = db.checklists.some(
        (c) => c.empleadoId === emp.id && c.areaId === area.id && c.fechaOperacion === hoy
      );
      if (!contesto) res.push({ empleado: emp, area });
    }
  }
  return res;
}

export interface ResultadoProceso {
  evaluados: number;
  enviados: number;
  errores: number;
  sinConfigurar: number;
  omitidos: number;
}

export async function procesarEncuestasVencidas(): Promise<ResultadoProceso> {
  const db = readDb();
  const hoy = getLocalISODate(0);
  const notifs = (db.notificaciones = db.notificaciones || []);
  const pendientes = obtenerPendientesVencidos(db);
  const out: ResultadoProceso = { evaluados: pendientes.length, enviados: 0, errores: 0, sinConfigurar: 0, omitidos: 0 };

  const porEmpleado = new Map<string, PendienteEncuesta[]>();
  for (const p of pendientes) {
    const prev = notifs.find(
      (n) => n.empleadoId === p.empleado.id && n.areaId === p.area.id && n.fecha === hoy && n.tipo === 'ENCUESTA_VENCIDA'
    );
    if (prev?.estado === 'ENVIADO') continue;
    const reintentoInmediato = prev?.estado === 'SIN_CONFIGURAR' && mailConfigurado();
    if (prev && !reintentoInmediato && Date.now() - new Date(prev.enviadoEn).getTime() < REINTENTO_MINUTOS * 60000) continue;
    const arr = porEmpleado.get(p.empleado.id) || [];
    arr.push(p);
    porEmpleado.set(p.empleado.id, arr);
  }

  let cambios = false;
  for (const items of Array.from(porEmpleado.values())) {
    const emp = items[0].empleado;
    const areas = items.map((i) => i.area);
    const correo = (emp.correo || '').trim();
    if (!correo || !destinatarioPermitido(correo)) {
      out.omitidos++;
      continue;
    }
    const r = await enviarCorreo(
      correo,
      `SmartCheck: encuesta no contestada (${areas.map((a) => a.nombre).join(', ')}) - ${hoy}`,
      htmlVencida(emp, areas, hoy)
    );
    for (const a of areas) {
      const prev = notifs.find(
        (n) => n.empleadoId === emp.id && n.areaId === a.id && n.fecha === hoy && n.tipo === 'ENCUESTA_VENCIDA'
      );
      const base: NotificacionCorreo = {
        id: prev?.id || `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        empleadoId: emp.id,
        numeroEmpleado: emp.numeroEmpleado,
        nombreEmpleado: emp.nombreCompleto,
        areaId: a.id,
        areaNombre: a.nombre,
        fecha: hoy,
        tipo: 'ENCUESTA_VENCIDA',
        destinatario: correo,
        estado: r.estado,
        detalle: r.detalle,
        intentos: (prev?.intentos || 0) + 1,
        enviadoEn: new Date().toISOString(),
      };
      if (prev) Object.assign(prev, base);
      else notifs.unshift(base);
    }
    if (r.estado === 'ENVIADO') out.enviados++;
    else if (r.estado === 'ERROR') out.errores++;
    else out.sinConfigurar++;
    registerAudit(db, {
      actorIdentificador: 'Sistema',
      modulo: 'NOTIFICACIONES',
      accion: r.estado === 'ENVIADO' ? 'CORREO_ENCUESTA_VENCIDA' : 'CORREO_FALLIDO',
      entidad: 'Empleado',
      entidadId: emp.numeroEmpleado,
      detalles: `Correo a ${correo} (${areas.map((a) => a.nombre).join(', ')}): ${r.estado}${r.detalle ? ' - ' + r.detalle : ''}`,
    });
    cambios = true;
  }

  if (cambios) {
    db.notificaciones = notifs.slice(0, 200);
    writeDb(db);
  }
  return out;
}

export async function enviarCorreoPrueba(numeroEmpleado: string) {
  const db = readDb();
  const emp = db.empleados.find((e) => e.numeroEmpleado === numeroEmpleado);
  if (!emp) return { ok: false as const, error: 'Empleado no encontrado.' };
  if (!emp.correo) return { ok: false as const, error: 'El empleado no tiene correo registrado.' };
  const areas = [emp.areaId, emp.areaIdSecundaria]
    .filter((x): x is number => Boolean(x))
    .map((id) => db.areas.find((a) => a.id === id))
    .filter((a): a is Area => Boolean(a));
  const hoy = getLocalISODate(0);
  const r = await enviarCorreo(
    emp.correo,
    `SmartCheck (PRUEBA): encuesta no contestada - ${hoy}`,
    htmlVencida(emp, areas, hoy)
  );
  const notifs = (db.notificaciones = db.notificaciones || []);
  notifs.unshift({
    id: `ntf-${Date.now()}`,
    empleadoId: emp.id,
    numeroEmpleado: emp.numeroEmpleado,
    nombreEmpleado: emp.nombreCompleto,
    areaId: emp.areaId,
    areaNombre: areas.map((a) => a.nombre).join(' / '),
    fecha: hoy,
    tipo: 'PRUEBA',
    destinatario: emp.correo,
    estado: r.estado,
    detalle: r.detalle,
    intentos: 1,
    enviadoEn: new Date().toISOString(),
  });
  db.notificaciones = notifs.slice(0, 200);
  writeDb(db);
  return { ok: r.estado === 'ENVIADO', estado: r.estado, detalle: r.detalle, destinatario: emp.correo };
}
