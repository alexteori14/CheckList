'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area as RechartsArea,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileText,
  AlertOctagon,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
  Edit3,
  Power,
  Building2,
  ClipboardList,
  Shield,
  Calendar,
  Award,
  Eye,
  Lock,
  LogOut,
  RefreshCw,
  X,
  Check,
  KeyRound,
  Trash2,
} from 'lucide-react';
import {
  Area,
  AuditLog,
  ChecklistRecord,
  Criticidad,
  Empleado,
  Evidencia,
  Pregunta,
  RoleCode,
} from '@/types';
import { exportToExcel, exportToPDF } from '@/lib/exportReports';
import { cn } from '@/lib/utils';

interface DashboardApiResponse {
  checklists: ChecklistRecord[];
  kpis: {
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
  };
  estadisticasDiarias: {
    fecha: string;
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
    areaMasIncidencias: string;
  };
  estadisticasSemanales: {
    fechaInicio: string;
    fechaFin: string;
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
    tendenciaSemanal: Array<{
      fecha: string;
      etiqueta: string;
      cumplimiento: number;
      incidencias: number;
      checklists: number;
      respuestasSi: number;
      respuestasNo: number;
    }>;
  };
  estadisticasMensuales: {
    fechaInicio: string;
    fechaFin: string;
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
    evolucionMensual: Array<{
      mes: string;
      cumplimiento: number;
      porcentajeIncidencias: number;
      totalChecklists: number;
      totalSi: number;
      totalNo: number;
    }>;
    rankingAreas: Array<{
      areaId: number;
      codigo: string;
      areaNombre: string;
      colorHex: string;
      totalChecklists: number;
      totalSi: number;
      totalNo: number;
      cumplimientoGeneral: number;
      porcentajeIncidencias: number;
    }>;
  };
  cumplimientoPorArea: Array<{
    areaId: number;
    codigo: string;
    areaNombre: string;
    colorHex: string;
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
  }>;
  cumplimientoPorUsuario: Array<{
    empleadoId: string;
    numeroEmpleado: string;
    nombreCompleto: string;
    areaNombre: string;
    rolCodigo: RoleCode;
    activo: boolean;
    totalChecklists: number;
    totalRespuestas: number;
    totalSi: number;
    totalNo: number;
    cumplimientoGeneral: number;
    porcentajeIncidencias: number;
  }>;
  incidenciasDetectadas: Array<{
    respuestaId: string;
    checklistId: string;
    folio: string;
    fechaOperacion: string;
    numeroEmpleado: string;
    nombreEmpleado: string;
    areaId: number;
    areaNombre: string;
    preguntaCodigo: string;
    preguntaTexto: string;
    categoria: string;
    criticidad: Criticidad;
    motivoNo: string;
    estadoIncidencia: 'N/A' | 'ABIERTA' | 'EN_ATENCION' | 'RESUELTA';
    evidencia: Evidencia | null;
    respondidoEn: string;
  }>;
}

type AdminSection =
  | 'dashboard'
  | 'estadisticas'
  | 'incidencias'
  | 'reportes'
  | 'usuarios'
  | 'checklists_admin'
  | 'auditoria';

/**
 * Parsea y formatea de forma consistente y segura (sin errores de zona horaria UTC)
 * el día de la semana, fecha legible y la hora de captura de una encuesta.
 */
function getFormatoDiaYFecha(fechaStr?: string, createdAt?: string) {
  if (!fechaStr) {
    return {
      diaSemana: '',
      fechaCorta: '',
      fechaCompleta: '',
      hora: '',
    };
  }

  // Parsear 'YYYY-MM-DD' en hora local para evitar desfases de zona horaria UTC
  const parts = fechaStr.split('-').map(Number);
  let d: Date;
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(fechaStr);
  }

  // Nombre del día en español (ej: "Lunes", "Martes", "Miércoles")
  const diaSemanaRaw = d.toLocaleDateString('es-MX', { weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1);

  // Formato de fecha legible (ej: "20 oct 2026")
  const fechaCorta = d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Formato extendido completo (ej: "20 de octubre de 2026")
  const fechaCompleta = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Hora de captura desde createdAt
  let hora = '';
  if (createdAt) {
    try {
      const createdDate = new Date(createdAt);
      if (!isNaN(createdDate.getTime())) {
        hora = createdDate.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {
      // ignorar error de formato
    }
  }

  return {
    diaSemana,
    fechaCorta,
    fechaCompleta,
    hora,
  };
}

export default function AdminDashboard() {
  const shouldReduceMotion = useReducedMotion();

  const [authUser, setAuthUser] = useState<{
    id: string;
    numeroEmpleado: string;
    nombreCompleto: string;
    areaNombre: string;
    rolCodigo: RoleCode;
  } | null>(null);
  const [loginNumero, setLoginNumero] = useState<string>('1000');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [statsPeriodTab, setStatsPeriodTab] = useState<'diarias' | 'semanales' | 'mensuales'>('diarias');

  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'dia' | 'semana' | 'mes' | 'rango'>('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('');
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>('');
  const [filtroAreaId, setFiltroAreaId] = useState<string>('todas');
  const [filtroEmpleadoId, setFiltroEmpleadoId] = useState<string>('todos');

  const [dashboardData, setDashboardData] = useState<DashboardApiResponse | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [auditoria, setAuditoria] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Visor de Evidencia Fotográfica Individual
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<{
    evidencia: Evidencia;
    folio: string;
    preguntaCodigo: string;
    motivoNo: string;
    nombreEmpleado: string;
    areaNombre: string;
  } | null>(null);

  // Visor de Encuesta Completa Realizada por Empleado / Encargado de Área
  const [selectedChecklistModal, setSelectedChecklistModal] = useState<ChecklistRecord | null>(null);

  // Confirmaciones accesibles para acciones destructivas (AlertDialogs)
  const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<Empleado | null>(null);
  const [confirmDeleteChecklist, setConfirmDeleteChecklist] = useState<ChecklistRecord | null>(null);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState<Pregunta | null>(null);
  const [confirmDeleteArea, setConfirmDeleteArea] = useState<Area | null>(null);

  // Alta / Edición de Empleados (sin campo correo)
  const [editingUser, setEditingUser] = useState<Empleado | null>(null);
  const [userForm, setUserForm] = useState<{
    numeroEmpleado: string;
    nombreCompleto: string;
    areaId: number;
    rolCodigo: RoleCode;
  }>({
    numeroEmpleado: '',
    nombreCompleto: '',
    areaId: 1,
    rolCodigo: 'OPERADOR',
  });
  const [userMessage, setUserMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Creación de Área Dinámica (solo Nombre del Área, sin código corto ni encargado)
  const [newAreaName, setNewAreaName] = useState<string>('');

  // Creación de Nueva Pregunta
  const [newQuestionForm, setNewQuestionForm] = useState<{
    areaId: number;
    categoria: string;
    texto: string;
    descripcionAyuda: string;
    criticidad: Criticidad;
  }>({
    areaId: 1,
    categoria: 'Inspección Operativa',
    texto: '',
    descripcionAyuda: '',
    criticidad: 'ALTA',
  });
  const [adminConfigMsg, setAdminConfigMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user && d.user.rolCodigo === 'ADMIN') {
          setAuthUser(d.user);
        } else {
          setAuthUser(null);
        }
      })
      .catch(() => {
        setAuthUser(null);
      });
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodo: filtroPeriodo,
        fechaInicio: filtroFechaInicio,
        fechaFin: filtroFechaFin,
        areaId: filtroAreaId,
        empleadoId: filtroEmpleadoId,
      });

      const [chkRes, empRes, qRes, audRes] = await Promise.all([
        fetch(`/api/checklists?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/employees?includeInactive=true', { cache: 'no-store' }),
        fetch('/api/questions?includeInactive=true', { cache: 'no-store' }),
        fetch('/api/audit', { cache: 'no-store' }),
      ]);

      const [chkData, empData, qData, audData] = await Promise.all([
        chkRes.json(),
        empRes.json(),
        qRes.json(),
        audRes.json(),
      ]);

      const loadedAreas: Area[] = empData.areas || [];
      setDashboardData(chkData);
      setEmpleados(empData.empleados || []);
      setAreas(loadedAreas);
      setPreguntas(qData.preguntas || []);
      setAuditoria(audData.auditoria || []);

      if (loadedAreas.length > 0) {
        const firstAreaId = loadedAreas[0].id;
        setUserForm((prev) =>
          loadedAreas.some((a) => a.id === prev.areaId)
            ? prev
            : { ...prev, areaId: firstAreaId }
        );
        setNewQuestionForm((prev) =>
          loadedAreas.some((a) => a.id === prev.areaId)
            ? prev
            : { ...prev, areaId: firstAreaId }
        );
        if (
          filtroAreaId !== 'todas' &&
          !loadedAreas.some((a) => String(a.id) === filtroAreaId)
        ) {
          setFiltroAreaId('todas');
        }
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [filtroPeriodo, filtroFechaInicio, filtroFechaFin, filtroAreaId, filtroEmpleadoId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Cierre accesible con tecla Escape para todos los diálogos y visores modales
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDeleteChecklist) {
        setConfirmDeleteChecklist(null);
      } else if (confirmDeleteQuestion) {
        setConfirmDeleteQuestion(null);
      } else if (confirmDeleteArea) {
        setConfirmDeleteArea(null);
      } else if (confirmDeactivateUser) {
        setConfirmDeactivateUser(null);
      } else if (selectedEvidenceModal) {
        setSelectedEvidenceModal(null);
      } else if (selectedChecklistModal) {
        setSelectedChecklistModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    confirmDeleteChecklist,
    confirmDeleteQuestion,
    confirmDeleteArea,
    confirmDeactivateUser,
    selectedEvidenceModal,
    selectedChecklistModal,
  ]);

  const resetFilters = () => {
    setFiltroPeriodo('todos');
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroAreaId('todas');
    setFiltroEmpleadoId('todos');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroEmpleado: loginNumero, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Credenciales inválidas. Verifica el número y contraseña.');
        return;
      }
      setAuthUser(data.user);
      fetchAllData();
    } catch {
      setLoginError('Error de conexión al servidor de autenticación.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {}
    setAuthUser(null);
    setLoginNumero('1000');
    setLoginPassword('');
    setLoginError('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMessage(null);

    if (!userForm.numeroEmpleado.trim() || !userForm.nombreCompleto.trim()) {
      setUserMessage({
        type: 'err',
        text: 'El Número de empleado y el Nombre completo son obligatorios.',
      });
      return;
    }

    try {
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { id: editingUser.id, ...userForm }
        : userForm;

      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserMessage({ type: 'err', text: data.error || 'Error al guardar usuario.' });
        return;
      }

      setUserMessage({
        type: 'ok',
        text: editingUser
          ? `Empleado #${data.empleado.numeroEmpleado} actualizado correctamente.`
          : `Empleado #${data.empleado.numeroEmpleado} (${data.empleado.nombreCompleto}) dado de alta con éxito.`,
      });
      setEditingUser(null);
      setUserForm({
        numeroEmpleado: '',
        nombreCompleto: '',
        areaId: areas[0]?.id || 1,
        rolCodigo: 'OPERADOR',
      });
      fetchAllData();
    } catch {
      setUserMessage({ type: 'err', text: 'Error de conexión al guardar usuario.' });
    }
  };

  const executeToggleUserActive = async (emp: Empleado) => {
    try {
      await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, activo: !emp.activo }),
      });
      setConfirmDeactivateUser(null);
      fetchAllData();
    } catch {}
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminConfigMsg(null);
    if (!newAreaName.trim()) return;
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newAreaName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminConfigMsg({
          type: 'ok',
          text: `Área "${data.area.nombre}" creada exitosamente con ${data.preguntasCreadas.length} preguntas operativas iniciales.`,
        });
        setNewAreaName('');
        fetchAllData();
      } else {
        setAdminConfigMsg({
          type: 'err',
          text: data.error || 'No se pudo crear el área.',
        });
      }
    } catch {
      setAdminConfigMsg({ type: 'err', text: 'Error de conexión al crear el área.' });
    }
  };

  const executeDeleteArea = async (area: Area) => {
    setAdminConfigMsg(null);
    try {
      const res = await fetch(`/api/areas?id=${area.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAdminConfigMsg({
          type: 'ok',
          text: `El área "${area.nombre}" y sus preguntas asociadas fueron eliminadas.`,
        });
        setConfirmDeleteArea(null);
        fetchAllData();
      } else {
        setAdminConfigMsg({
          type: 'err',
          text: data.error || 'No fue posible eliminar el área.',
        });
        setConfirmDeleteArea(null);
      }
    } catch {
      setAdminConfigMsg({ type: 'err', text: 'Error al eliminar el área.' });
      setConfirmDeleteArea(null);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminConfigMsg(null);
    if (!newQuestionForm.texto.trim()) return;
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestionForm),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminConfigMsg({
          type: 'ok',
          text: `Pregunta ${data.pregunta.codigo} agregada al checklist.`,
        });
        setNewQuestionForm((prev) => ({ ...prev, texto: '', descripcionAyuda: '' }));
        fetchAllData();
      }
    } catch {}
  };

  const handleToggleQuestionActive = async (q: Pregunta) => {
    await fetch('/api/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: q.id, activo: !q.activo }),
    });
    fetchAllData();
  };

  const executeDeleteQuestion = async (q: Pregunta) => {
    setAdminConfigMsg(null);
    try {
      const res = await fetch(`/api/questions?id=${q.id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminConfigMsg({
          type: 'ok',
          text: `Pregunta ${q.codigo} eliminada permanentemente.`,
        });
        setConfirmDeleteQuestion(null);
        fetchAllData();
      }
    } catch {
      setConfirmDeleteQuestion(null);
    }
  };

  const executeDeleteChecklist = async (chk: ChecklistRecord) => {
    try {
      const res = await fetch(`/api/checklists?id=${encodeURIComponent(chk.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmDeleteChecklist(null);
        if (selectedChecklistModal?.id === chk.id) {
          setSelectedChecklistModal(null);
        }
        fetchAllData();
      }
    } catch {
      setConfirmDeleteChecklist(null);
    }
  };

  const handleUpdateIncidentStatus = async (
    checklistId: string,
    respuestaId: string,
    estadoIncidencia: 'ABIERTA' | 'EN_ATENCION' | 'RESUELTA'
  ) => {
    await fetch('/api/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistId, respuestaId, estadoIncidencia }),
    });
    fetchAllData();
  };

  const buildFilterLabel = () => {
    const pLabel = {
      todos: 'Histórico Completo',
      dia: 'Hoy / Día actual',
      semana: 'Últimos 7 días (Semanal)',
      mes: 'Últimos 30 días (Mensual)',
      rango: `Rango (${filtroFechaInicio || 'Inicio'} a ${filtroFechaFin || 'Fin'})`,
    }[filtroPeriodo];
    const aLabel =
      filtroAreaId === 'todas'
        ? 'Todas las Áreas'
        : areas.find((a) => String(a.id) === filtroAreaId)?.nombre || filtroAreaId;
    const uLabel =
      filtroEmpleadoId === 'todos'
        ? 'Todos los Empleados'
        : empleados.find((e) => e.id === filtroEmpleadoId)?.nombreCompleto || filtroEmpleadoId;
    return `${pLabel} | Área: ${aLabel} | Empleado: ${uLabel}`;
  };

  const handleExportPDF = () => {
    if (!dashboardData) return;
    exportToPDF({
      tituloFiltro: buildFilterLabel(),
      kpis: dashboardData.kpis,
      cumplimientoPorArea: dashboardData.cumplimientoPorArea,
      cumplimientoPorUsuario: dashboardData.cumplimientoPorUsuario,
      checklists: dashboardData.checklists,
      incidencias: dashboardData.incidenciasDetectadas,
    });
  };

  const handleExportExcel = () => {
    if (!dashboardData) return;
    exportToExcel({
      tituloFiltro: buildFilterLabel(),
      kpis: dashboardData.kpis,
      cumplimientoPorArea: dashboardData.cumplimientoPorArea,
      cumplimientoPorUsuario: dashboardData.cumplimientoPorUsuario,
      checklists: dashboardData.checklists,
      incidencias: dashboardData.incidenciasDetectadas,
    });
  };

  if (!authUser) {
    return (
      <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white text-center">
          <div className="size-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Lock className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-balance">Acceso Administrativo SmartCheck</h2>
          <p className="text-xs text-slate-300 mt-1 text-pretty">
            Módulo exclusivo para el Administrador General (<strong>Oscar Mercado</strong>)
          </p>
        </div>

        <div className="p-4 bg-blue-50/60 border-b border-blue-100 text-xs text-blue-900 leading-relaxed text-pretty">
          <strong>Aviso Operativo:</strong> Los jefes de departamento de Sistemas (Infraestructura, Control y Mantenimiento) responden sus cuestionarios directamente en el módulo <strong>"Realizar Checklist"</strong> sin requerir este acceso.
        </div>

        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {loginError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
            >
              {loginError}
            </div>
          )}
          <div>
            <label htmlFor="login-emp" className="block text-xs font-bold text-slate-800 mb-1">
              Número de Empleado o Usuario
            </label>
            <input
              id="login-emp"
              type="text"
              value={loginNumero}
              onChange={(e) => setLoginNumero(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold tabular-nums focus:border-blue-600"
              placeholder="1000"
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="block text-xs font-bold text-slate-800 mb-1">
              Contraseña
            </label>
            <input
              id="login-pass"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-blue-600"
              placeholder="••••••••"
            />
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <strong>Credenciales de Administrador:</strong> Empleado <code>1000</code> (Oscar Mercado) / Contraseña{' '}
            <code>admin123</code>
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors motion-safe:active:scale-[0.98]"
          >
            {loggingIn ? 'Verificando credenciales...' : 'Ingresar como Administrador'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Ejecutiva + Navegación de Sub-módulos Administrativos */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
              Centro de Control y Analítica Ejecutiva
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 tabular-nums">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                <KeyRound className="size-3" /> Administrador Activo • Rol: {authUser.rolCodigo}
              </span>
              <span>
                Sesión: <strong className="text-slate-900">{authUser.nombreCompleto}</strong> (#
                {authUser.numeroEmpleado})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-semibold transition-colors"
                title="Cerrar Sesión de Administrador"
              >
                <LogOut className="size-3" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <FileText className="size-4" />
              <span>Exportar PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <FileSpreadsheet className="size-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              aria-label="Actualizar indicadores en tiempo real"
              onClick={fetchAllData}
              className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Actualizar indicadores en tiempo real"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin text-blue-600')} />
            </button>
            <button
              type="button"
              onClick={() => setAuthUser(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-800 text-slate-700 text-xs font-bold transition-colors"
              title="Cambiar usuario administrador"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Cambiar Usuario</span>
            </button>
          </div>
        </div>

        {/* Pestañas del Módulo Administrativo */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto pb-1">
          {[
            { id: 'dashboard', label: 'Dashboard Ejecutivo & KPIs', icon: LayoutDashboard },
            { id: 'estadisticas', label: 'Estadísticas (Día / Semana / Mes)', icon: TrendingUp },
            {
              id: 'incidencias',
              label: `Incidencias y Evidencias (${dashboardData?.incidenciasDetectadas.length || 0})`,
              icon: AlertOctagon,
            },
            {
              id: 'reportes',
              label: `Encuestas Realizadas y Reportes (${dashboardData?.checklists.length || 0})`,
              icon: FileSpreadsheet,
            },
            { id: 'usuarios', label: `Empleados (${empleados.length})`, icon: Users },
            { id: 'checklists_admin', label: 'Áreas y Preguntas', icon: ClipboardList },
            { id: 'auditoria', label: 'Auditoría', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setUserMessage(null);
                  setAdminConfigMsg(null);
                  setActiveSection(tab.id as AdminSection);
                }}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 transition-colors tabular-nums border motion-safe:active:scale-[0.98]',
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skeleton estructural de carga inicial */}
      {loading && !dashboardData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-5 border border-slate-200 h-28 animate-pulse flex flex-col justify-between"
            >
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-200 rounded" />
              <div className="h-2.5 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Barra Global de Filtros Dinámicos */}
      {(activeSection === 'dashboard' ||
        activeSection === 'incidencias' ||
        activeSection === 'reportes') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Filter className="size-4 text-blue-600" />
              <span>Filtros Dinámicos (Día, Semana, Mes, Rango, Área y Empleado)</span>
            </div>
            {(filtroPeriodo !== 'todos' ||
              filtroAreaId !== 'todas' ||
              filtroEmpleadoId !== 'todos') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Restablecer filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label htmlFor="f-periodo" className="block text-xs font-bold text-slate-700 mb-1">
                Periodo
              </label>
              <select
                id="f-periodo"
                value={filtroPeriodo}
                onChange={(e) =>
                  setFiltroPeriodo(
                    e.target.value as 'todos' | 'dia' | 'semana' | 'mes' | 'rango'
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
              >
                <option value="todos">Histórico Completo</option>
                <option value="dia">Hoy (Día actual)</option>
                <option value="semana">Últimos 7 días (Semana)</option>
                <option value="mes">Últimos 30 días (Mes)</option>
                <option value="rango">Rango de fechas personalizado</option>
              </select>
            </div>

            {filtroPeriodo === 'rango' ? (
              <>
                <div>
                  <label htmlFor="f-inicio" className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    id="f-inicio"
                    type="date"
                    value={filtroFechaInicio}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="f-fin" className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    id="f-fin"
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold tabular-nums"
                  />
                </div>
              </>
            ) : (
              <div className="hidden lg:block">
                <label htmlFor="f-especifica" className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Específica (Opcional)
                </label>
                <input
                  id="f-especifica"
                  type="date"
                  value={filtroFechaInicio}
                  onChange={(e) => {
                    setFiltroFechaInicio(e.target.value);
                    if (e.target.value) setFiltroPeriodo('dia');
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold tabular-nums"
                />
              </div>
            )}

            <div>
              <label htmlFor="f-area" className="block text-xs font-bold text-slate-700 mb-1">
                Área
              </label>
              <select
                id="f-area"
                value={filtroAreaId}
                onChange={(e) => setFiltroAreaId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
              >
                <option value="todas">Todas las Áreas</option>
                {areas.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-usuario" className="block text-xs font-bold text-slate-700 mb-1">
                Empleado / Encargado
              </label>
              <select
                id="f-usuario"
                value={filtroEmpleadoId}
                onChange={(e) => setFiltroEmpleadoId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
              >
                <option value="todos">Todos los Empleados</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    #{emp.numeroEmpleado} - {emp.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <motion.div
        key={activeSection}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
          {/* =====================================================================
              SECCIÓN 1: DASHBOARD EJECUTIVO Y KPIs
             ===================================================================== */}
          {activeSection === 'dashboard' && dashboardData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 tabular-nums">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Encuestas Realizadas
                    </span>
                    <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <ClipboardList className="size-5" />
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-3">
                    {dashboardData.kpis.totalChecklists}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {dashboardData.kpis.totalRespuestas} puntos inspeccionados
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      Respuestas Positivas (Sí)
                    </span>
                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="size-5" />
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700 mt-3">
                    {dashboardData.kpis.totalSi}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Puntos en cumplimiento</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">
                      Respuestas Negativas (No)
                    </span>
                    <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                      <XCircle className="size-5" />
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-rose-700 mt-3">
                    {dashboardData.kpis.totalNo}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Incidencias detectadas</p>
                </div>

                <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-100">
                      % Cumplimiento General
                    </span>
                    <TrendingUp className="size-5 text-blue-100" />
                  </div>
                  <p className="text-3xl font-bold mt-3">
                    {dashboardData.kpis.cumplimientoGeneral}%
                  </p>
                  <p className="text-xs text-blue-100 mt-1">
                    (Total Sí / Total Resp.) × 100
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">
                      % de Incidencias
                    </span>
                    <AlertOctagon className="size-5 text-rose-600" />
                  </div>
                  <p className="text-3xl font-bold text-rose-700 mt-3">
                    {dashboardData.kpis.porcentajeIncidencias}%
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    (Total No / Total Resp.) × 100
                  </p>
                </div>
              </div>

              {/* Gráficas Ejecutivas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 text-balance">
                        Tendencia de Cumplimiento y Comportamiento (7 días)
                      </h3>
                      <p className="text-xs text-slate-600 text-pretty">
                        Evolución diaria del porcentaje de cumplimiento operativo
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md tabular-nums">
                      Meta: ≥ 90%
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.estadisticasSemanales.tendenciaSemanal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                        <Tooltip
                          formatter={(val: number) => [`${val}%`, 'Cumplimiento']}
                          labelFormatter={(l) => `Fecha: ${l}`}
                        />
                        <RechartsArea
                          type="monotone"
                          dataKey="cumplimiento"
                          stroke="#2563EB"
                          strokeWidth={3}
                          fill="#DBEAFE"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 text-balance">
                      Comparativo de Desempeño entre Áreas
                    </h3>
                    <p className="text-xs text-slate-600 text-pretty">
                      Porcentaje de cumplimiento vs porcentaje de incidencias por área
                    </p>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.cumplimientoPorArea}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="areaNombre" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="cumplimientoGeneral"
                          name="% Cumplimiento"
                          fill="#10B981"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="porcentajeIncidencias"
                          name="% Incidencias"
                          fill="#EF4444"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Cumplimiento por Área y Cumplimiento por Empleado */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-4 text-balance">
                    KPI de Cumplimiento por Área
                  </h3>
                  <div className="divide-y divide-slate-200">
                    {dashboardData.cumplimientoPorArea.map((area) => (
                      <div key={area.areaId} className="py-3.5 first:pt-0 last:pb-0 space-y-2 tabular-nums">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: area.colorHex }}
                            />
                            <span className="font-bold text-sm text-slate-900">
                              {area.areaNombre}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-blue-700">
                            {area.cumplimientoGeneral}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full w-full origin-left"
                            initial={false}
                            animate={{ scaleX: area.cumplimientoGeneral / 100 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={{ backgroundColor: area.colorHex }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{area.totalChecklists} encuestas</span>
                          <span>
                            <strong className="text-emerald-700">{area.totalSi} Sí</strong> •{' '}
                            <strong className="text-rose-700">{area.totalNo} No</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 text-balance">
                      KPI de Cumplimiento por Empleado / Encargado de Área
                    </h3>
                    <p className="text-xs text-slate-600 text-pretty">
                      Desglose individual de encuestas realizadas, respuestas positivas e incidencias
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs tabular-nums">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="py-3 px-3"># Emp.</th>
                          <th className="py-3 px-3">Empleado / Encargado</th>
                          <th className="py-3 px-3">Área</th>
                          <th className="py-3 px-3 text-center">Encuestas</th>
                          <th className="py-3 px-3 text-center">Sí</th>
                          <th className="py-3 px-3 text-center">No</th>
                          <th className="py-3 px-3 text-right">% Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dashboardData.cumplimientoPorUsuario.map((u) => (
                          <tr key={u.empleadoId} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-blue-700">
                              #{u.numeroEmpleado}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {u.nombreCompleto}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{u.areaNombre}</td>
                            <td className="py-3 px-3 text-center font-bold">
                              {u.totalChecklists}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-700">
                              {u.totalSi}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-rose-700">
                              {u.totalNo}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={cn(
                                  'inline-block px-2.5 py-1 rounded-md font-bold',
                                  u.cumplimientoGeneral >= 90
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : u.cumplimientoGeneral >= 80
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                )}
                              >
                                {u.cumplimientoGeneral}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tabla directa de Últimas Encuestas Realizadas con botón "Ver Encuesta" y "Eliminar" */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 text-balance">
                      Encuestas Realizadas por Empleados y Encargados de Área
                    </h3>
                    <p className="text-xs text-slate-600 text-pretty">
                      Haz clic en &ldquo;Ver Encuesta&rdquo; para inspeccionar todas las respuestas de cada empleado o elimina una encuesta junto con su evidencia escrita y fotográfica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('reportes')}
                    className="text-xs font-bold text-blue-700 hover:underline shrink-0"
                  >
                    Ver listado completo ({dashboardData.checklists.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="py-3 px-3">Folio</th>
                        <th className="py-3 px-3">Día y Fecha</th>
                        <th className="py-3 px-3"># Emp.</th>
                        <th className="py-3 px-3">Empleado / Encargado</th>
                        <th className="py-3 px-3">Área</th>
                        <th className="py-3 px-3 text-center">Sí</th>
                        <th className="py-3 px-3 text-center">No</th>
                        <th className="py-3 px-3 text-right">% Cumplim.</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardData.checklists.slice(0, 10).map((c) => {
                        const infoFecha = getFormatoDiaYFecha(c.fechaOperacion, c.createdAt);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {c.folio}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                    {infoFecha.diaSemana}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-xs">
                                    {infoFecha.fechaCorta}
                                  </span>
                                </div>
                                {infoFecha.hora && (
                                  <span className="text-[10px] text-slate-500 font-mono pl-0.5">
                                    {infoFecha.hora}
                                  </span>
                                )}
                              </div>
                            </td>
                          <td className="py-3 px-3 font-mono text-blue-700 font-bold">
                            #{c.numeroEmpleado}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {c.nombreEmpleado}
                          </td>
                          <td className="py-3 px-3">{c.areaNombre}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {c.totalSi}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-rose-700">
                            {c.totalNo}
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            {c.porcentajeCumplimiento}%
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedChecklistModal(c)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                              >
                                <Eye className="size-3.5" />
                                <span>Ver Encuesta</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Eliminar encuesta ${c.folio}`}
                                onClick={() => setConfirmDeleteChecklist(c)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                title="Eliminar encuesta y sus evidencias"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 2: ESTADÍSTICAS AUTOMÁTICAS: DIARIAS, SEMANALES Y MENSUALES
             ===================================================================== */}
          {activeSection === 'estadisticas' && dashboardData && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-blue-600" />
                  <h2 className="font-bold text-slate-900 text-sm text-balance">
                    Motor de Estadísticas Automáticas por Periodo
                  </h2>
                </div>
                <LayoutGroup id="stats-period-nav">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {[
                      { id: 'diarias', label: 'Estadísticas Diarias (Hoy)' },
                      { id: 'semanales', label: 'Estadísticas Semanales (7 Días)' },
                      { id: 'mensuales', label: 'Estadísticas Mensuales (Histórico)' },
                    ].map((t) => {
                      const active = statsPeriodTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setStatsPeriodTab(
                              t.id as 'diarias' | 'semanales' | 'mensuales'
                            )
                          }
                          className={cn(
                            'relative px-4 py-2 rounded-lg text-xs font-bold transition-colors',
                            active ? 'text-white' : 'text-slate-700 hover:text-slate-950'
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="active-stats-period-pill"
                              className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm"
                              transition={
                                shouldReduceMotion
                                  ? { duration: 0.01 }
                                  : { type: 'spring', stiffness: 420, damping: 34 }
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

              {statsPeriodTab === 'diarias' && (
                <div className="space-y-6 tabular-nums">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                      <span className="text-xs font-bold text-slate-600">
                        Encuestas Realizadas Hoy
                      </span>
                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {dashboardData.estadisticasDiarias.totalChecklists}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Fecha: {dashboardData.estadisticasDiarias.fecha}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm">
                      <span className="text-xs font-bold text-blue-700">
                        Cumplimiento del Día
                      </span>
                      <p className="text-3xl font-bold text-blue-700 mt-2">
                        {dashboardData.estadisticasDiarias.cumplimientoGeneral}%
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Promedio global de hoy</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm">
                      <span className="text-xs font-bold text-emerald-800">
                        Total Respuestas Sí (Hoy)
                      </span>
                      <p className="text-3xl font-bold text-emerald-700 mt-2">
                        {dashboardData.estadisticasDiarias.totalSi}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Verificaciones positivas</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm">
                      <span className="text-xs font-bold text-rose-800">
                        Total Respuestas No (Hoy)
                      </span>
                      <p className="text-3xl font-bold text-rose-700 mt-2">
                        {dashboardData.estadisticasDiarias.totalNo}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Incidencias del día</p>
                    </div>

                    <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm">
                      <span className="text-xs font-bold text-rose-900">
                        Área con Más Incidencias
                      </span>
                      <p className="text-lg font-bold text-rose-950 mt-2">
                        {dashboardData.estadisticasDiarias.areaMasIncidencias}
                      </p>
                      <p className="text-xs text-rose-800 mt-1">Monitoreo prioritario hoy</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-4 text-balance">
                      Distribución de Respuestas del Día (Sí vs No)
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'Respuestas Sí (Cumple)',
                                value: dashboardData.estadisticasDiarias.totalSi,
                              },
                              {
                                name: 'Respuestas No (Incidencias)',
                                value: dashboardData.estadisticasDiarias.totalNo,
                              },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            label
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {statsPeriodTab === 'semanales' && (
                <div className="space-y-6 tabular-nums">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-blue-700">
                        Cumplimiento Semanal
                      </span>
                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {dashboardData.estadisticasSemanales.cumplimientoGeneral}%
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {dashboardData.estadisticasSemanales.fechaInicio} al{' '}
                        {dashboardData.estadisticasSemanales.fechaFin}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">
                        Encuestas de la Semana
                      </span>
                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {dashboardData.estadisticasSemanales.totalChecklists}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-emerald-800">
                        Respuestas Positivas (Semana)
                      </span>
                      <p className="text-3xl font-bold text-emerald-700 mt-2">
                        {dashboardData.estadisticasSemanales.totalSi}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-rose-200">
                      <span className="text-xs font-bold text-rose-800">
                        Incidencias por Semana
                      </span>
                      <p className="text-3xl font-bold text-rose-700 mt-2">
                        {dashboardData.estadisticasSemanales.totalNo}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 mb-4 text-balance">
                      Tendencias Semanales: Respuestas Sí vs Incidencias por Día
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.estadisticasSemanales.tendenciaSemanal}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="etiqueta" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="respuestasSi"
                            name="Respuestas Sí"
                            fill="#10B981"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="respuestasNo"
                            name="Incidencias (No)"
                            fill="#EF4444"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {statsPeriodTab === 'mensuales' && (
                <div className="space-y-6 tabular-nums">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-blue-700">
                        Cumplimiento Mensual
                      </span>
                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {dashboardData.estadisticasMensuales.cumplimientoGeneral}%
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-rose-800">
                        Incidencias Mensuales
                      </span>
                      <p className="text-3xl font-bold text-rose-700 mt-2">
                        {dashboardData.estadisticasMensuales.totalNo}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">
                        Encuestas del Mes
                      </span>
                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {dashboardData.estadisticasMensuales.totalChecklists}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-800">
                        Área Líder del Ranking
                      </span>
                      <p className="text-xl font-bold text-emerald-900 mt-2">
                        {dashboardData.estadisticasMensuales.rankingAreas[0]?.areaNombre || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <h3 className="text-base font-bold text-slate-900 mb-4 text-balance">
                        Evolución Histórica por Mes (% Cumplimiento)
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.estadisticasMensuales.evolucionMensual}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="mes" />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip />
                            <Bar
                              dataKey="cumplimiento"
                              name="% Cumplimiento"
                              fill="#2563EB"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2 text-balance">
                        <Award className="size-5 text-amber-500" />
                        <span>Ranking Mensual de Áreas</span>
                      </h3>
                      <div className="divide-y divide-slate-200">
                        {dashboardData.estadisticasMensuales.rankingAreas.map((area, idx) => (
                          <div
                            key={area.areaId}
                            className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'size-8 rounded-lg font-bold text-sm flex items-center justify-center',
                                  idx === 0
                                    ? 'bg-amber-400 text-slate-950'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-900'
                                    : 'bg-amber-100 text-amber-950'
                                )}
                              >
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {area.areaNombre}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {area.totalChecklists} encuestas • {area.totalNo} incidencias
                                </p>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-blue-700">
                              {area.cumplimientoGeneral}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 3: INCIDENCIAS DETECTADAS Y VISOR DE EVIDENCIAS FOTOGRÁFICAS
             ===================================================================== */}
          {activeSection === 'incidencias' && dashboardData && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 text-balance">
                    Bandeja de Incidencias Detectadas (Respuestas &ldquo;No&rdquo;)
                  </h2>
                  <p className="text-xs text-slate-600 text-pretty">
                    Cada incidencia incluye su motivo escrito obligatorio y su fotografía de evidencia adjunta.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold tabular-nums">
                  Total Incidencias: {dashboardData.incidenciasDetectadas.length}
                </span>
              </div>

              {dashboardData.incidenciasDetectadas.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                  <p className="text-sm font-bold text-slate-800">
                    No se encontraron incidencias con los filtros seleccionados.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Mostrar todas las incidencias
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {dashboardData.incidenciasDetectadas.map((inc) => (
                    <div
                      key={inc.respuestaId}
                      className="py-5 first:pt-0 last:pb-0 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 tabular-nums">
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-900 text-white">
                            {inc.folio} • {inc.preguntaCodigo}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {(() => {
                              const info = getFormatoDiaYFecha(inc.fechaOperacion);
                              return (
                                <>
                                  <span className="font-bold text-slate-800 capitalize">{info.diaSemana}</span> • {info.fechaCorta}
                                </>
                              );
                            })()}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 mb-2 text-pretty">
                          {inc.preguntaTexto}
                        </p>

                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 text-xs mb-3">
                          <strong className="block text-rose-800 mb-0.5">
                            Evidencia Escrita (Motivo Obligatorio):
                          </strong>
                          <span className="text-pretty">{inc.motivoNo}</span>
                        </div>

                        <p className="text-xs text-slate-700 tabular-nums">
                          Reportado por: <strong>#{inc.numeroEmpleado} {inc.nombreEmpleado}</strong> • Área:{' '}
                          <strong className="text-blue-700">{inc.areaNombre}</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select
                          aria-label={`Estado de incidencia ${inc.preguntaCodigo}`}
                          value={inc.estadoIncidencia}
                          onChange={(e) =>
                            handleUpdateIncidentStatus(
                              inc.checklistId,
                              inc.respuestaId,
                              e.target.value as 'ABIERTA' | 'EN_ATENCION' | 'RESUELTA'
                            )
                          }
                          className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded-lg border',
                            inc.estadoIncidencia === 'RESUELTA'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : inc.estadoIncidencia === 'EN_ATENCION'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-rose-50 text-rose-900 border-rose-300'
                          )}
                        >
                          <option value="ABIERTA">Estado: ABIERTA</option>
                          <option value="EN_ATENCION">Estado: EN ATENCIÓN</option>
                          <option value="RESUELTA">Estado: RESUELTA</option>
                        </select>

                        {inc.evidencia ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEvidenceModal({
                                evidencia: inc.evidencia!,
                                folio: inc.folio,
                                preguntaCodigo: inc.preguntaCodigo,
                                motivoNo: inc.motivoNo,
                                nombreEmpleado: inc.nombreEmpleado,
                                areaNombre: inc.areaNombre,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                          >
                            <Eye className="size-3.5" />
                            <span>Ver Fotografía ({inc.evidencia.formato})</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">
                            Sin fotografía opcional
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 4: ENCUESTAS REALIZADAS (VER / ELIMINAR) Y REPORTES PDF / EXCEL
             ===================================================================== */}
          {activeSection === 'reportes' && dashboardData && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 text-balance">
                    Bitácora de Encuestas Realizadas y Exportación de Reportes
                  </h2>
                  <p className="text-xs text-slate-600 text-pretty">
                    Consulta la encuesta completa respondida por cada empleado/encargado de área o elimínala junto con toda su evidencia fotográfica y escrita.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
                  >
                    <FileText className="size-4" />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <FileSpreadsheet className="size-4" />
                    <span>Descargar Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {dashboardData.checklists.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                  <p className="text-sm font-bold text-slate-800">
                    No hay encuestas registradas para los criterios de filtro actuales.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Restablecer filtros y ver histórico completo
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="py-3 px-3">Folio</th>
                        <th className="py-3 px-3">Día y Fecha</th>
                        <th className="py-3 px-3"># Emp.</th>
                        <th className="py-3 px-3">Empleado / Encargado de Área</th>
                        <th className="py-3 px-3">Área</th>
                        <th className="py-3 px-3 text-center">Respuestas Sí</th>
                        <th className="py-3 px-3 text-center">Respuestas No</th>
                        <th className="py-3 px-3 text-right">% Cumplimiento</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardData.checklists.map((c) => {
                        const infoFecha = getFormatoDiaYFecha(c.fechaOperacion, c.createdAt);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {c.folio}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                    {infoFecha.diaSemana}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-xs">
                                    {infoFecha.fechaCorta}
                                  </span>
                                </div>
                                {infoFecha.hora && (
                                  <span className="text-[10px] text-slate-500 font-mono pl-0.5">
                                    {infoFecha.hora}
                                  </span>
                                )}
                              </div>
                            </td>
                          <td className="py-3 px-3 font-mono text-blue-700 font-bold">
                            #{c.numeroEmpleado}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {c.nombreEmpleado}
                          </td>
                          <td className="py-3 px-3">{c.areaNombre}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {c.totalSi}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-rose-700">
                            {c.totalNo}
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            {c.porcentajeCumplimiento}%
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedChecklistModal(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
                              >
                                <Eye className="size-3.5" />
                                <span>Ver Encuesta</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Eliminar encuesta ${c.folio}`}
                                onClick={() => setConfirmDeleteChecklist(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                                title="Eliminar encuesta y su evidencia fotográfica y escrita"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 5: ADMINISTRACIÓN DE EMPLEADOS (Sin correo electrónico)
             ===================================================================== */}
          {activeSection === 'usuarios' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2 text-balance">
                  <Plus className="size-5 text-blue-600" />
                  <span>
                    {editingUser ? `Editar Empleado #${editingUser.numeroEmpleado}` : 'Dar de Alta Empleado'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mb-4 text-pretty">
                  Identificación directa por Número de Empleado y Nombre Completo.
                </p>

                {userMessage && (
                  <div
                    role="status"
                    className={cn(
                      'p-3 rounded-lg text-xs font-bold mb-4',
                      userMessage.type === 'ok'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    )}
                  >
                    {userMessage.text}
                  </div>
                )}

                <form onSubmit={handleSaveUser} className="space-y-3.5">
                  <div>
                    <label htmlFor="u-num" className="block text-xs font-bold text-slate-800 mb-1">
                      Número de Empleado <span className="text-rose-600">* (Obligatorio)</span>
                    </label>
                    <input
                      id="u-num"
                      type="text"
                      required
                      value={userForm.numeroEmpleado}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, numeroEmpleado: e.target.value }))
                      }
                      placeholder="Ej. 2007"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor="u-nombre" className="block text-xs font-bold text-slate-800 mb-1">
                      Nombre Completo <span className="text-rose-600">* (Obligatorio)</span>
                    </label>
                    <input
                      id="u-nombre"
                      type="text"
                      required
                      value={userForm.nombreCompleto}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, nombreCompleto: e.target.value }))
                      }
                      placeholder="Ej. Ing. Mariana López"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="u-area" className="block text-xs font-bold text-slate-800 mb-1">
                      Área Asignada
                    </label>
                    <select
                      id="u-area"
                      value={userForm.areaId}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, areaId: Number(e.target.value) }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold bg-white"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="u-rol" className="block text-xs font-bold text-slate-800 mb-1">
                      Rol en Plataforma
                    </label>
                    <select
                      id="u-rol"
                      value={userForm.rolCodigo}
                      onChange={(e) =>
                        setUserForm((prev) => ({
                          ...prev,
                          rolCodigo: e.target.value as RoleCode,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold bg-white"
                    >
                      <option value="OPERADOR">OPERADOR / ENCARGADO DE ÁREA</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="ADMIN">ADMINISTRADOR GENERAL</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                    >
                      {editingUser ? 'Guardar Cambios' : 'Registrar Empleado'}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(null);
                          setUserForm({
                            numeroEmpleado: '',
                            nombreCompleto: '',
                            areaId: areas[0]?.id || 1,
                            rolCodigo: 'OPERADOR',
                          });
                        }}
                        className="px-4 py-3 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 text-balance tabular-nums">
                  Directorio de Empleados y Encargados Registrados ({empleados.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="py-3 px-3"># Emp.</th>
                        <th className="py-3 px-3">Nombre Completo</th>
                        <th className="py-3 px-3">Área</th>
                        <th className="py-3 px-3">Rol</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empleados.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-blue-700">
                            #{emp.numeroEmpleado}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {emp.nombreCompleto}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {emp.areaNombre}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                              {emp.rolCodigo}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {emp.activo ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                                <Check className="size-3" /> Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200 font-bold">
                                <X className="size-3" /> Inactivo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              type="button"
                              aria-label={`Editar empleado ${emp.nombreCompleto}`}
                              onClick={() => {
                                setEditingUser(emp);
                                setUserForm({
                                  numeroEmpleado: emp.numeroEmpleado,
                                  nombreCompleto: emp.nombreCompleto,
                                  areaId: emp.areaId,
                                  rolCodigo: emp.rolCodigo,
                                });
                              }}
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700"
                              title="Editar empleado"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={
                                emp.activo
                                  ? `Desactivar empleado ${emp.nombreCompleto}`
                                  : `Activar empleado ${emp.nombreCompleto}`
                              }
                              onClick={() => {
                                if (emp.activo) {
                                  setConfirmDeactivateUser(emp);
                                } else {
                                  executeToggleUserActive(emp);
                                }
                              }}
                              className={cn(
                                'p-2 rounded-lg',
                                emp.activo
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              )}
                              title={emp.activo ? 'Desactivar empleado' : 'Activar empleado'}
                            >
                              <Power className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 6: ADMINISTRAR ÁREAS Y PREGUNTAS (Crear / Eliminar Áreas y Preguntas)
             ===================================================================== */}
          {activeSection === 'checklists_admin' && (
            <div className="space-y-6">
              {adminConfigMsg && (
                <div
                  role="status"
                  className={cn(
                    'p-4 rounded-xl border text-xs font-bold',
                    adminConfigMsg.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  )}
                >
                  {adminConfigMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gestión de Áreas: Crear (solo nombre) y Eliminar Área */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2 text-balance">
                      <Building2 className="size-5 text-blue-600" />
                      <span>Administración de Áreas</span>
                    </h3>
                    <p className="text-xs text-slate-600 text-pretty">
                      Agrega nuevas áreas operativas ingresando únicamente su nombre o elimina áreas existentes.
                    </p>
                  </div>

                  <form onSubmit={handleCreateArea} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1">
                      <label htmlFor="a-nombre" className="sr-only">
                        Nombre del Área
                      </label>
                      <input
                        id="a-nombre"
                        type="text"
                        required
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Nombre de la nueva área (ej. Calidad, Logística...)"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shrink-0"
                    >
                      + Crear Área
                    </button>
                  </form>

                  <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
                    {areas.map((area) => {
                      const countPreguntas = preguntas.filter((p) => p.areaId === area.id).length;
                      return (
                        <div
                          key={area.id}
                          className="py-3 flex items-center justify-between gap-3 tabular-nums"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: area.colorHex }}
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{area.nombre}</p>
                              <p className="text-xs text-slate-600">
                                {countPreguntas} pregunta(s) configurada(s)
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={areas.length <= 1}
                            onClick={() => setConfirmDeleteArea(area)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                              areas.length <= 1
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            )}
                            title="Eliminar área"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Eliminar Área</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Agregar Nueva Pregunta a un Área */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2 text-balance">
                    <ClipboardList className="size-5 text-emerald-600" />
                    <span>Agregar Nueva Pregunta al Checklist</span>
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 text-pretty">
                    Las preguntas agregadas aparecen inmediatamente en las tarjetas de evaluación de esa área.
                  </p>

                  <form onSubmit={handleCreateQuestion} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="q-area" className="block text-xs font-bold text-slate-800 mb-1">
                          Área Destino *
                        </label>
                        <select
                          id="q-area"
                          value={newQuestionForm.areaId}
                          onChange={(e) =>
                            setNewQuestionForm((p) => ({
                              ...p,
                              areaId: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
                        >
                          {areas.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="q-crit" className="block text-xs font-bold text-slate-800 mb-1">
                          Criticidad
                        </label>
                        <select
                          id="q-crit"
                          value={newQuestionForm.criticidad}
                          onChange={(e) =>
                            setNewQuestionForm((p) => ({
                              ...p,
                              criticidad: e.target.value as Criticidad,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
                        >
                          <option value="CRITICA">CRÍTICA</option>
                          <option value="ALTA">ALTA</option>
                          <option value="MEDIA">MEDIA</option>
                          <option value="BAJA">BAJA</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="q-texto" className="block text-xs font-bold text-slate-800 mb-1">
                        Pregunta (Sí / No) *
                      </label>
                      <input
                        id="q-texto"
                        type="text"
                        required
                        value={newQuestionForm.texto}
                        onChange={(e) =>
                          setNewQuestionForm((p) => ({ ...p, texto: e.target.value }))
                        }
                        placeholder="¿El punto de inspección cumple con la norma operativa?"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                    >
                      Agregar Pregunta al Checklist
                    </button>
                  </form>
                </div>
              </div>

              {/* Listado de Preguntas con opción de Activar/Desactivar y Eliminar Pregunta */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 text-balance tabular-nums">
                  Preguntas Configuradas por Área ({preguntas.length})
                </h3>
                <div className="divide-y divide-slate-200">
                  {preguntas.map((q) => {
                    const areaObj = areas.find((a) => a.id === q.areaId);
                    return (
                      <div
                        key={q.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              {q.codigo}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {areaObj?.nombre}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {q.criticidad}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 text-pretty">{q.texto}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionActive(q)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                              q.activo
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            )}
                          >
                            {q.activo ? 'Activa' : 'Inactiva'}
                          </button>
                          <button
                            type="button"
                            aria-label={`Eliminar pregunta ${q.codigo}`}
                            onClick={() => setConfirmDeleteQuestion(q)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
                            title="Eliminar pregunta permanentemente"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              SECCIÓN 7: AUDITORÍA Y SEGURIDAD
             ===================================================================== */}
          {activeSection === 'auditoria' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 text-balance">
                  Bitácora de Auditoría e Historial de Operaciones
                </h2>
                <p className="text-xs text-slate-600 text-pretty">
                  Registro inmutable de inicios de sesión JWT, ejecución y eliminación de encuestas, altas/bajas de empleados y configuración de áreas.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                      <th className="py-3 px-3">Fecha / Hora</th>
                      <th className="py-3 px-3">Actor / Usuario</th>
                      <th className="py-3 px-3">Módulo</th>
                      <th className="py-3 px-3">Acción</th>
                      <th className="py-3 px-3">Detalles de la Operación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditoria.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {new Date(log.createdAt).toLocaleString('es-MX')}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {log.actorIdentificador}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                            {log.modulo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {log.accion}
                        </td>
                        <td className="py-3 px-3 text-slate-700 text-pretty">{log.detalles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </motion.div>

      {/* =====================================================================
          MODAL: VER ENCUESTA COMPLETA REALIZADA POR EMPLEADO / ENCARGADO DE ÁREA
         ===================================================================== */}
      {selectedChecklistModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-survey-title"
          onClick={() => setSelectedChecklistModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
          >
            {/* Cabecera del Modal de Encuesta */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 id="view-survey-title" className="font-bold text-base text-balance">
                  Detalle de Encuesta Realizada • {selectedChecklistModal.folio}
                </h3>
                <p className="text-xs text-slate-300 tabular-nums">
                  Empleado / Encargado: <strong>#{selectedChecklistModal.numeroEmpleado} {selectedChecklistModal.nombreEmpleado}</strong> • Área:{' '}
                  <strong>{selectedChecklistModal.areaNombre}</strong> • Día y Fecha:{' '}
                  <strong className="text-white">
                    {(() => {
                      const info = getFormatoDiaYFecha(selectedChecklistModal.fechaOperacion, selectedChecklistModal.createdAt);
                      return `${info.diaSemana}, ${info.fechaCompleta}${info.hora ? ` (${info.hora})` : ''}`;
                    })()}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle de encuesta"
                onClick={() => setSelectedChecklistModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Resumen de indicadores de la encuesta */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Cumplimiento: <strong className="text-blue-700 text-sm">{selectedChecklistModal.porcentajeCumplimiento}%</strong>
                </span>
                <span>
                  Respuestas Sí: <strong className="text-emerald-700">{selectedChecklistModal.totalSi}</strong>
                </span>
                <span>
                  Respuestas No (Incidencias): <strong className="text-rose-700">{selectedChecklistModal.totalNo}</strong>
                </span>
                <span>
                  Tiempo de captura: <strong>{selectedChecklistModal.duracionSegundos} s</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setConfirmDeleteChecklist(selectedChecklistModal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs"
              >
                <Trash2 className="size-3.5" />
                <span>Eliminar Encuesta y Evidencias</span>
              </button>
            </div>

            {/* Lista detallada de preguntas respondidas en la encuesta */}
            <div className="p-6 overflow-y-auto divide-y divide-slate-200 space-y-4">
              {selectedChecklistModal.respuestas.map((resp, idx) => (
                <div key={resp.id} className={cn('pt-4 first:pt-0 space-y-2.5')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 max-w-xl">
                      <span className="inline-flex items-center justify-center size-6 rounded bg-slate-100 text-slate-800 font-bold text-xs shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-700">
                          {resp.preguntaCodigo} • {resp.categoria}
                        </span>
                        <p className="text-sm font-bold text-slate-900 text-pretty mt-0.5">
                          {resp.preguntaTexto}
                        </p>
                      </div>
                    </div>

                    {resp.respuesta ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold shrink-0">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>Sí, Cumple</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold shrink-0">
                        <XCircle className="size-4 text-rose-600" />
                        <span>No Cumple</span>
                      </span>
                    )}
                  </div>

                  {/* Si respondió No, mostrar su Evidencia Escrita y su Evidencia Fotográfica */}
                  {!resp.respuesta && (
                    <div className="ml-8 p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-rose-800 block">
                          Evidencia Escrita (Motivo del &ldquo;No&rdquo;):
                        </span>
                        <p className="text-xs text-rose-950 mt-0.5 text-pretty">
                          {resp.motivoNo || 'Sin motivo registrado'}
                        </p>
                      </div>

                      {resp.evidencia ? (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-800 block">
                            Evidencia Fotográfica Adjunta ({resp.evidencia.nombreArchivo}):
                          </span>
                          <img
                            src={resp.evidencia.dataUrl}
                            alt={`Evidencia de ${resp.preguntaCodigo}`}
                            className="max-h-56 rounded-lg border border-slate-300 bg-slate-900 object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">
                          Sin fotografía adjunta en esta pregunta.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog: Confirmar Eliminación de Encuesta + Evidencia Fotográfica y Escrita */}
      {confirmDeleteChecklist && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-chk-title"
          aria-describedby="delete-chk-desc"
          onClick={() => setConfirmDeleteChecklist(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <h4 id="delete-chk-title" className="text-lg font-bold text-slate-900 text-balance">
              ¿Eliminar la encuesta {confirmDeleteChecklist.folio}?
            </h4>
            <p id="delete-chk-desc" className="text-sm text-slate-600 text-pretty">
              Se eliminará permanentemente la encuesta realizada por{' '}
              <strong>{confirmDeleteChecklist.nombreEmpleado}</strong> junto con todas sus respuestas,{' '}
              <strong>evidencias escritas (motivos de incumplimiento)</strong> y{' '}
              <strong>evidencias fotográficas</strong> asociadas.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteChecklist(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDeleteChecklist(confirmDeleteChecklist)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Sí, eliminar encuesta y evidencias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog: Confirmar Eliminación de Pregunta */}
      {confirmDeleteQuestion && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-q-title"
          aria-describedby="delete-q-desc"
          onClick={() => setConfirmDeleteQuestion(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <h4 id="delete-q-title" className="text-lg font-bold text-slate-900 text-balance">
              ¿Eliminar la pregunta {confirmDeleteQuestion.codigo}?
            </h4>
            <p id="delete-q-desc" className="text-sm text-slate-600 text-pretty">
              La pregunta <strong>&ldquo;{confirmDeleteQuestion.texto}&rdquo;</strong> se eliminará de la plantilla del checklist.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteQuestion(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDeleteQuestion(confirmDeleteQuestion)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Sí, eliminar pregunta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog: Confirmar Eliminación de Área */}
      {confirmDeleteArea && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-area-title"
          aria-describedby="delete-area-desc"
          onClick={() => setConfirmDeleteArea(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <h4 id="delete-area-title" className="text-lg font-bold text-slate-900 text-balance">
              ¿Eliminar el área &ldquo;{confirmDeleteArea.nombre}&rdquo;?
            </h4>
            <p id="delete-area-desc" className="text-sm text-slate-600 text-pretty">
              Al eliminar el área <strong>{confirmDeleteArea.nombre}</strong> también se eliminarán sus preguntas configuradas en el checklist.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteArea(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDeleteArea(confirmDeleteArea)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Sí, eliminar área
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog: Confirmar Desactivación de Empleado */}
      {confirmDeactivateUser && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="deactivate-user-title"
          aria-describedby="deactivate-user-desc"
          onClick={() => setConfirmDeactivateUser(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <h4 id="deactivate-user-title" className="text-lg font-bold text-slate-900 text-balance">
              ¿Desactivar al empleado #{confirmDeactivateUser.numeroEmpleado}?
            </h4>
            <p id="deactivate-user-desc" className="text-sm text-slate-600 text-pretty">
              <strong>{confirmDeactivateUser.nombreCompleto}</strong> no podrá iniciar nuevos checklists mientras su cuenta permanezca inactiva.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeactivateUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeToggleUserActive(confirmDeactivateUser)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Sí, desactivar empleado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Inspeccionar Evidencia Fotográfica Individual */}
      {selectedEvidenceModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-dialog-title"
          onClick={() => setSelectedEvidenceModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 id="evidence-dialog-title" className="font-bold text-sm text-balance">
                  Evidencia Fotográfica • {selectedEvidenceModal.folio} ({selectedEvidenceModal.preguntaCodigo})
                </h4>
                <p className="text-xs text-slate-300">
                  Área: {selectedEvidenceModal.areaNombre}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar visor de evidencia"
                onClick={() => setSelectedEvidenceModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <img
                src={selectedEvidenceModal.evidencia.dataUrl}
                alt="Evidencia de incidencia"
                className="w-full max-h-80 object-contain rounded-xl bg-slate-900 border border-slate-200"
              />
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 text-pretty">
                <strong>Evidencia Escrita (Motivo Obligatorio):</strong> {selectedEvidenceModal.motivoNo}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                <span>Reportado por: {selectedEvidenceModal.nombreEmpleado}</span>
                <span>
                  Archivo: {selectedEvidenceModal.evidencia.nombreArchivo} (
                  {selectedEvidenceModal.evidencia.formato})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
