'use client';

import React, { useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  Server,
  Database,
  ShieldCheck,
  CheckSquare,
  Globe,
  FileCode,
  Rocket,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DocTab = 'arquitectura' | 'bd' | 'apis' | 'roadmap';

export default function ArchitectureView() {
  const [activeTab, setActiveTab] = useState<DocTab>('arquitectura');
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 text-balance">
              Ingeniería de Software, Base de Datos y Arquitectura Empresarial
            </h2>
            <p className="text-xs text-slate-600 mt-1 text-pretty">
              Consulta interactiva de los 19 entregables arquitectónicos, modelo entidad-relación, endpoints REST, seguridad JWT y plan de despliegue.
            </p>
          </div>

          <LayoutGroup id="arch-tabs">
            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200">
              {[
                { id: 'arquitectura', label: 'Arquitectura y UX/UI' },
                { id: 'bd', label: 'Base de Datos (10 Tablas)' },
                { id: 'apis', label: 'APIs REST y Seguridad' },
                { id: 'roadmap', label: 'Pruebas, Despliegue y Roadmap' },
              ].map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveTab(t.id as DocTab)}
                    className={cn(
                      'relative px-3.5 py-2 rounded-lg text-xs font-bold transition-colors motion-safe:active:scale-[0.98]',
                      active ? 'text-white' : 'text-slate-700 hover:text-slate-950'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-arch-pill"
                        className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0.01 }
                            : { type: 'spring', stiffness: 450, damping: 35 }
                        }
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <motion.div
          key={activeTab}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
            {activeTab === 'arquitectura' && (
              <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="size-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Globe className="size-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm text-balance">
                    Frontend: Next.js + React + TypeScript + Framer Motion
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed text-pretty">
                    Interfaz moderna basada en tarjetas con transiciones físicas en Framer Motion, avance en 1 clic al responder Sí, barra de progreso animada por compositor (scaleX), cámara WebRTC en vivo, Drag & Drop de evidencias y gráficas Recharts.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="size-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Server className="size-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm text-balance">
                    Backend Modular API REST & Reglas de Negocio
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed text-pretty">
                    Controladores desacoplados con validación estricta en servidor: prohibición de guardar respuestas negativas sin motivo, validación MIME para JPG/PNG/WEBP, autocompletado de empleado/área y motor de cálculo de KPIs en tiempo real.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="size-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Database className="size-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm text-balance">
                    PostgreSQL + Azure Blob Storage
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed text-pretty">
                    Esquema relacional 3FN en <code>database/schema_postgresql.sql</code> con 10 tablas normalizadas, llaves primarias UUID/Serial, llaves foráneas, índices compuestos, triggers de actualización y bitácora inmutable de auditoría.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'bd' && (
              <div className="pt-6 space-y-4">
                <p className="text-xs text-slate-600 text-pretty">
                  Las <strong>10 tablas obligatorias</strong> solicitadas en la Sección 10 de <code>Especificaciones.txt</code> están implementadas y su DDL completo se encuentra en <code>database/schema_postgresql.sql</code>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 tabular-nums">
                  {[
                    { name: 'roles', desc: 'PK: id | Código (ADMIN, SUPERVISOR, OPERADOR) y permisos JSONB.' },
                    { name: 'areas', desc: 'PK: id | Infraestructura, Control, Mantenimiento + áreas dinámicas.' },
                    { name: 'usuarios', desc: 'PK: uuid | Credenciales cifradas PBKDF2/Bcrypt, rol_id (FK) y bloqueos.' },
                    { name: 'empleados', desc: 'PK: uuid | Índice único en numero_empleado, area_id (FK) y rol_id (FK).' },
                    { name: 'preguntas', desc: 'PK: id | Banco dinámico por area_id (FK), criticidad y orden.' },
                    { name: 'checklists', desc: 'PK: uuid | Folio único, empleado_id (FK), area_id (FK), fecha y KPIs.' },
                    { name: 'respuestas', desc: 'PK: uuid | CHECK constraint: exige motivo_no obligatorio cuando respuesta = FALSE.' },
                    { name: 'evidencias', desc: 'PK: uuid | respuesta_id (FK), formato (JPG/PNG/WEBP) y URL Blob Storage.' },
                    { name: 'estadisticas', desc: 'PK: id | Agregaciones automáticas DIARIO, SEMANAL y MENSUAL.' },
                    { name: 'auditoria', desc: 'PK: bigserial | Historial inmutable de operaciones, actor, IP y JSON diff.' },
                  ].map((tb) => (
                    <div key={tb.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <p className="font-mono font-bold text-xs text-blue-700">{tb.name}</p>
                      <p className="text-xs text-slate-600 mt-1 text-pretty">{tb.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'apis' && (
              <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 text-balance">
                    <FileCode className="size-4 text-blue-600" /> Endpoints REST Implementados
                  </h4>
                  <ul className="text-xs space-y-1.5 font-mono text-slate-700">
                    <li><strong>POST /api/auth</strong> — Login exclusivo Administrador (Oscar Mercado)</li>
                    <li><strong>DELETE /api/auth</strong> — Cierre de sesión (Logout) con revocación y auditoría</li>
                    <li><strong>GET  /api/employees?numero=1001</strong> — Autocompletado de Nombre, Área y Preguntas</li>
                    <li><strong>POST / PUT /api/employees</strong> — Alta y edición simplificada de personal</li>
                    <li><strong>GET  / POST / DELETE /api/areas</strong> — Catálogo, alta y baja dinámica de áreas</li>
                    <li><strong>GET  / POST / PUT / DELETE /api/questions</strong> — Banco y eliminación de preguntas</li>
                    <li><strong>GET  / POST / DELETE /api/checklists</strong> — Guardado con confirmación, KPIs y cascada</li>
                    <li><strong>GET  /api/audit</strong> — Bitácora inmutable de operaciones</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 text-balance">
                    <ShieldCheck className="size-4 text-emerald-600" /> Estrategia de Seguridad y Segregación
                  </h4>
                  <ul className="text-xs space-y-1.5 text-slate-600 text-pretty">
                    <li>• <strong>Acceso Exclusivo de Administrador:</strong> Dashboard y configuración bajo custodia única de Oscar Mercado.</li>
                    <li>• <strong>Logout Seguro:</strong> Invocación DELETE /api/auth con destrucción de cookies HttpOnly.</li>
                    <li>• <strong>Segregación Operativa:</strong> Jefes de departamento (Infraestructura, Control, Mantenimiento) solo contestan checklists.</li>
                    <li>• <strong>Confirmación Defensiva:</strong> Modal previo al envío con opción interactiva de cambiar respuestas antes del guardado.</li>
                    <li>• <strong>Contraseñas Cifradas:</strong> Hash criptográfico PBKDF2-SHA256 con sal dedicada en tiempo constante.</li>
                    <li>• <strong>Validación Estricta:</strong> Motivo obligatorio en No y evidencias limitadas a JPG, PNG y WEBP.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-balance">
                    <CheckSquare className="size-4 text-blue-600" /> Plan de Pruebas QA
                  </h4>
                  <p className="text-slate-600 text-pretty">
                    Pruebas unitarias de cálculo de KPIs, pruebas de integración de endpoints REST (regla de motivo obligatorio en No, autocompletado por número de empleado) y pruebas E2E responsivas en móvil/escritorio.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-balance">
                    <Rocket className="size-4 text-emerald-600" /> Despliegue y Escalabilidad
                  </h4>
                  <p className="text-slate-600 text-pretty">
                    Contenerización con Docker, CI/CD en GitHub Actions / Azure DevOps, base de datos gestionada Azure Database for PostgreSQL y almacenamiento de evidencias en Azure Blob Storage con CDN.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-balance">
                    <AlertTriangle className="size-4 text-amber-600" /> Riesgos y Futuras Mejoras
                  </h4>
                  <p className="text-slate-600 text-pretty">
                    Modo Offline-First con PWA Service Workers para zonas sin cobertura Wi-Fi, notificaciones push automáticas ante incidencias críticas y reconocimiento de anomalías por IA en fotografías.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
      </div>
    </div>
  );
}
