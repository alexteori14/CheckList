'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Mail, Save, Send, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estadoVentana, formatMinutos } from '@/lib/schedule';
import type { NotificacionCorreo } from '@/types';

export interface TiempoVidaArea {
  areaId: number;
  areaNombre: string;
  colorHex: string;
  horaInicio: string;
  horaFin: string;
  esperados: number;
  contestadas: number;
  enTiempo: number;
  fueraDeTiempo: number;
  pendientes: Array<{ numeroEmpleado: string; nombreCompleto: string; correo: string }>;
}

export interface TiempoVidaData {
  resumenFiltro: {
    total: number;
    enTiempo: number;
    fueraDeTiempo: number;
    porcentajeEnTiempo: number;
  };
  hoy: TiempoVidaArea[];
}

interface Props {
  data: TiempoVidaData;
  compact?: boolean;
  onChanged: () => void;
}

export default function TiempoVidaPanel({ data, compact = false, onChanged }: Props) {
  const [now, setNow] = useState<Date>(new Date());
  const [edits, setEdits] = useState<Record<number, { ini: string; fin: string }>>({});
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [notifs, setNotifs] = useState<NotificacionCorreo[]>([]);
  const [mailOk, setMailOk] = useState<boolean>(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/notificaciones', { cache: 'no-store' });
      const d = await r.json();
      setNotifs(d.notificaciones || []);
      setMailOk(Boolean(d.configurado));
    } catch {
      /* sin conexión */
    }
  }, []);

  useEffect(() => {
    if (!compact) loadNotifs();
  }, [compact, loadNotifs, data]);

  const dirty = useMemo(
    () =>
      data.hoy.filter((a) => {
        const e = edits[a.areaId];
        return e && (e.ini !== a.horaInicio || e.fin !== a.horaFin);
      }),
    [data.hoy, edits]
  );

  const guardar = async () => {
    setBusy('guardar');
    setMsg(null);
    try {
      for (const a of dirty) {
        const e = edits[a.areaId];
        const res = await fetch('/api/areas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: a.areaId, horaInicio: e.ini, horaFin: e.fin }),
        });
        const d = await res.json();
        if (!res.ok) {
          setMsg({ type: 'err', text: `${a.areaNombre}: ${d.error || 'No se pudo guardar.'}` });
          return;
        }
      }
      setEdits({});
      setMsg({ type: 'ok', text: 'Tiempo de vida actualizado correctamente.' });
      onChanged();
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión al guardar.' });
    } finally {
      setBusy('');
    }
  };

  const verificar = async () => {
    setBusy('verificar');
    setMsg(null);
    try {
      const r = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'verificar' }),
      });
      const d = await r.json();
      setMsg({
        type: d.errores > 0 ? 'err' : 'ok',
        text: `Pendientes vencidos: ${d.evaluados} • Correos enviados: ${d.enviados} • Errores: ${d.errores}${
          d.sinConfigurar ? ` • Sin configurar SMTP: ${d.sinConfigurar}` : ''
        }`,
      });
      loadNotifs();
    } catch {
      setMsg({ type: 'err', text: 'Error al verificar encuestas vencidas.' });
    } finally {
      setBusy('');
    }
  };

  const prueba = async () => {
    setBusy('prueba');
    setMsg(null);
    try {
      const r = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'prueba', numeroEmpleado: '2001' }),
      });
      const d = await r.json();
      setMsg(
        d.ok
          ? { type: 'ok', text: `Correo de prueba enviado a ${d.destinatario}.` }
          : { type: 'err', text: d.detalle || d.error || 'No se pudo enviar el correo de prueba.' }
      );
      loadNotifs();
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión al enviar la prueba.' });
    } finally {
      setBusy('');
    }
  };

  const r = data.resumenFiltro;
  const pct = r.porcentajeEnTiempo;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-balance">
            <Timer className="size-5 text-blue-600 shrink-0" />
            <span>Tiempo de Vida de la Encuesta</span>
          </h3>
          <p className="text-xs text-slate-600 text-pretty">
            Una encuesta está <strong>en tiempo</strong> si se contesta el mismo día dentro del horario de su área.
          </p>
        </div>
        <div className="flex items-center gap-4 tabular-nums">
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{pct}%</p>
            <p className="text-[11px] text-slate-600">contestadas en tiempo (filtro actual)</p>
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-700">{r.enTiempo} en tiempo</p>
            <p className="font-bold text-rose-700">{r.fueraDeTiempo} fuera de tiempo</p>
          </div>
        </div>
      </div>

      <div className="w-full h-2 bg-rose-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="py-2.5 px-3">Área</th>
              <th className="py-2.5 px-3">Horario (inicio – cierre)</th>
              <th className="py-2.5 px-3">Estado hoy</th>
              <th className="py-2.5 px-3 text-center">En tiempo</th>
              <th className="py-2.5 px-3 text-center">Fuera de tiempo</th>
              <th className="py-2.5 px-3">Pendientes hoy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.hoy.map((a) => {
              const ev = estadoVentana({ horaInicio: a.horaInicio, horaFin: a.horaFin }, now);
              const e = edits[a.areaId] || { ini: a.horaInicio, fin: a.horaFin };
              return (
                <tr key={a.areaId} className="hover:bg-slate-50 align-top">
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-900">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: a.colorHex }} />
                      {a.areaNombre}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {compact ? (
                      <span className="font-mono font-semibold text-slate-800">
                        {a.horaInicio} – {a.horaFin}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          aria-label={`Hora de inicio ${a.areaNombre}`}
                          value={e.ini}
                          onChange={(ev2) =>
                            setEdits((p) => ({ ...p, [a.areaId]: { ini: ev2.target.value, fin: e.fin } }))
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          aria-label={`Hora de cierre ${a.areaNombre}`}
                          value={e.fin}
                          onChange={(ev2) =>
                            setEdits((p) => ({ ...p, [a.areaId]: { ini: e.ini, fin: ev2.target.value } }))
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {ev.estado === 'ABIERTA' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        <Clock className="size-3" /> Abierta · cierra en {formatMinutos(ev.minutosRestantes)}
                      </span>
                    ) : ev.estado === 'ANTES' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                        <Clock className="size-3" /> Abre en {formatMinutos(ev.minutosParaAbrir)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                        <Clock className="size-3" /> Cerrada
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{a.enTiempo}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-700">{a.fueraDeTiempo}</td>
                  <td className="py-2.5 px-3">
                    {a.pendientes.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="size-3.5" /> Todos contestaron ({a.contestadas}/{a.esperados})
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'font-semibold',
                          ev.estado === 'CERRADA' ? 'text-rose-700' : 'text-slate-700'
                        )}
                      >
                        {ev.estado === 'CERRADA' && <AlertTriangle className="inline size-3.5 mr-1" />}
                        {a.pendientes.map((p) => p.nombreCompleto).join(', ')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="space-y-3 pt-1 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button
              type="button"
              disabled={dirty.length === 0 || busy !== ''}
              onClick={guardar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold"
            >
              <Save className="size-4" />
              <span>Guardar horarios{dirty.length > 0 ? ` (${dirty.length})` : ''}</span>
            </button>
            <button
              type="button"
              disabled={busy !== ''}
              onClick={verificar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold"
            >
              <Send className="size-4" />
              <span>{busy === 'verificar' ? 'Verificando…' : 'Verificar vencidos y enviar correos'}</span>
            </button>
            <button
              type="button"
              disabled={busy !== ''}
              onClick={prueba}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-60 text-amber-900 border border-amber-300 text-xs font-bold"
            >
              <Mail className="size-4" />
              <span>{busy === 'prueba' ? 'Enviando…' : 'Correo de prueba a Alejandro Puente'}</span>
            </button>
          </div>

          {!mailOk && (
            <p className="text-xs p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
              <strong>SMTP sin configurar:</strong> crea <code>.env.local</code> a partir de <code>.env.example</code> con la
              cuenta Gmail remitente y su contraseña de aplicación, y reinicia el servidor. Mientras tanto los intentos
              quedan registrados como &ldquo;SIN_CONFIGURAR&rdquo;.
            </p>
          )}
          {msg && (
            <p
              role="status"
              className={cn(
                'text-xs font-semibold p-3 rounded-lg border',
                msg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              )}
            >
              {msg.text}
            </p>
          )}

          {notifs.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs font-bold text-slate-800 mb-1.5">Últimos correos</p>
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  {notifs.slice(0, 5).map((n) => (
                    <tr key={n.id}>
                      <td className="py-1.5 pr-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(n.enviadoEn).toLocaleString('es-MX')}
                      </td>
                      <td className="py-1.5 pr-3 font-semibold">{n.nombreEmpleado}</td>
                      <td className="py-1.5 pr-3">{n.areaNombre}</td>
                      <td className="py-1.5 pr-3">{n.destinatario}</td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded font-bold',
                            n.estado === 'ENVIADO'
                              ? 'bg-emerald-50 text-emerald-800'
                              : n.estado === 'ERROR'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-amber-50 text-amber-800'
                          )}
                          title={n.detalle}
                        >
                          {n.tipo === 'PRUEBA' ? 'PRUEBA · ' : ''}
                          {n.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
