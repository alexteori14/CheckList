'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Camera,
  Upload,
  Calendar,
  UserCheck,
  Building2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon,
  Trash2,
  Layers,
  CreditCard,
  ShieldCheck,
  Clock,
  HelpCircle,
  Check,
  RefreshCw,
  Edit3,
  Lock,
  ShieldAlert,
  KeyRound,
  X,
} from 'lucide-react';
import {
  Area,
  CaptureOrigin,
  ChecklistRecord,
  Empleado,
  ImageFormat,
  Pregunta,
} from '@/types';
import { cn } from '@/lib/utils';

interface DraftAnswer {
  preguntaId: number;
  respuesta: boolean | null;
  motivoNo: string;
  evidencia?: {
    nombreArchivo: string;
    formato: ImageFormat;
    mimeType: string;
    tamanoBytes: number;
    dataUrl: string;
    origenCaptura: CaptureOrigin;
  };
}

interface ChecklistWizardProps {
  onChecklistCompleted: (record: ChecklistRecord) => void;
  onNavigateToDashboard: () => void;
}

const ALLOWED_MIMES: Record<string, ImageFormat> = {
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};

function getTodayFormatted(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOffsetDateFormatted(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ChecklistWizard({
  onChecklistCompleted,
  onNavigateToDashboard,
}: ChecklistWizardProps) {
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState<'identificacion' | 'preguntas' | 'completado'>('identificacion');

  // Datos de inicio (Sección 2 de Especificaciones.txt)
  const [numeroEmpleadoInput, setNumeroEmpleadoInput] = useState<string>('');
  const [fechaOperacion, setFechaOperacion] = useState<string>(getTodayFormatted());
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [areaEncontrada, setAreaEncontrada] = useState<Area | null>(null);
  const [areasAsignadas, setAreasAsignadas] = useState<Area[]>([]);
  const [preguntasArea, setPreguntasArea] = useState<Pregunta[]>([]);
  const [catalogoEmpleados, setCatalogoEmpleados] = useState<Empleado[]>([]);
  const [buscandoEmpleado, setBuscandoEmpleado] = useState<boolean>(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string>('');

  // Control de autorización de fechas atrasadas (> 5 días) por Oscar Mercado
  const [adminAuthOscar, setAdminAuthOscar] = useState<{
    autorizado: boolean;
    password?: string;
    token?: string;
    justificacion?: string;
    autorizadaEn?: string;
  } | null>(null);
  const [showOscarAuthModal, setShowOscarAuthModal] = useState<boolean>(false);
  const [fechaPendienteAutorizar, setFechaPendienteAutorizar] = useState<string>('');
  const [oscarPasswordInput, setOscarPasswordInput] = useState<string>('');
  const [oscarJustificacionInput, setOscarJustificacionInput] = useState<string>('');
  const [oscarAuthError, setOscarAuthError] = useState<string>('');
  const [oscarAuthLoading, setOscarAuthLoading] = useState<boolean>(false);

  // Experiencia de tarjetas (Sección 1, 3 y 4)
  const [displayMode, setDisplayMode] = useState<'single' | 'grouped'>('single');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [cardDirection, setCardDirection] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, DraftAnswer>>({});
  const [validationError, setValidationError] = useState<string>('');
  const [dragOverQuestionId, setDragOverQuestionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<ChecklistRecord | null>(null);
  const [startTimeMs, setStartTimeMs] = useState<number>(Date.now());

  // Confirmación accesible antes de eliminar evidencia fotográfica (AlertDialog)
  const [confirmRemoveQuestionId, setConfirmRemoveQuestionId] = useState<number | null>(null);

  // Modal de confirmación final y revisión de respuestas antes de enviar ("¿Seguro que ya deseas enviar?")
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState<boolean>(false);

  // Cámara WebRTC en vivo para escritorio o móvil
  const [activeCameraQuestionId, setActiveCameraQuestionId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setActiveCameraQuestionId(null);
  };

  useEffect(() => {
    if (step !== 'identificacion') return;
    fetch('/api/employees', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.empleados) {
          setCatalogoEmpleados(data.empleados);
        }
      })
      .catch(() => {});
  }, [step]);

  // Autocompletar Nombre del Empleado y Área al escribir el Número de Empleado
  useEffect(() => {
    if (step !== 'identificacion') return;
    const clean = numeroEmpleadoInput.trim();
    if (!clean) {
      setEmpleadoEncontrado(null);
      setAreaEncontrada(null);
      setAreasAsignadas([]);
      setPreguntasArea([]);
      setErrorBusqueda('');
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoEmpleado(true);
      setErrorBusqueda('');
      try {
        const res = await fetch(`/api/employees?numero=${encodeURIComponent(clean)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          setEmpleadoEncontrado(null);
          setAreaEncontrada(null);
          setAreasAsignadas([]);
          setPreguntasArea([]);
          setErrorBusqueda('No se encontró un empleado activo con ese número. Verifica el código e intenta de nuevo.');
        } else {
          const data = await res.json();
          setEmpleadoEncontrado(data.empleado);
          setAreaEncontrada(data.area);
          setAreasAsignadas(data.areasAsignadas || (data.area ? [data.area] : []));
          setPreguntasArea(data.preguntas || []);
          setErrorBusqueda('');
        }
      } catch {
        setErrorBusqueda('No fue posible consultar el directorio de empleados. Intenta nuevamente.');
      } finally {
        setBuscandoEmpleado(false);
      }
    }, 140);

    return () => clearTimeout(timer);
  }, [numeroEmpleadoInput, step]);

  const handleCambiarArea = async (selectedArea: Area) => {
    if (selectedArea.id === areaEncontrada?.id) return;
    setAreaEncontrada(selectedArea);
    try {
      const res = await fetch(`/api/questions?areaId=${selectedArea.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPreguntasArea(data.preguntas || []);
      }
    } catch (err) {
      console.error('Error al cambiar área asignada:', err);
    }
  };

  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
      stopCamera();
    };
  }, []);

  const startLiveCamera = async (preguntaId: number) => {
    setValidationError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setActiveCameraQuestionId(preguntaId);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      const mobileInput = document.getElementById(`camera-input-${preguntaId}`) as HTMLInputElement | null;
      if (mobileInput) {
        mobileInput.click();
      } else {
        setValidationError('No se detectó cámara en línea. Selecciona o arrastra una imagen JPG, PNG o WEBP desde tu equipo.');
      }
    }
  };

  const capturePhotoFromVideo = (preguntaId: number) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const approxBytes = Math.round((dataUrl.length * 3) / 4);

    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        evidencia: {
          nombreArchivo: `captura_camara_${preguntaId}_${Date.now()}.jpg`,
          formato: 'JPG',
          mimeType: 'image/jpeg',
          tamanoBytes: approxBytes,
          dataUrl,
          origenCaptura: 'CAMARA',
        },
      },
    }));
    stopCamera();
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setFechaOperacion(getTodayFormatted());
      return;
    }

    const todayStr = getTodayFormatted();
    const fiveDaysAgoStr = getOffsetDateFormatted(-5);

    // 1. REGLA ESTRICTA: No se puede adelantar fecha ni seleccionar días futuros
    if (val > todayStr) {
      setValidationError(
        `Política de Fechas: No es posible adelantar fechas ni seleccionar el día de mañana o días futuros (${val}). La encuesta solo puede registrarse para el día de hoy (${todayStr}) o días anteriores.`
      );
      setFechaOperacion(todayStr);
      return;
    }

    // 2. REGLA DE FECHA ATRASADA (> 5 días): Requiere autorización del Administrador Oscar Mercado
    if (val < fiveDaysAgoStr) {
      if (adminAuthOscar) {
        setFechaOperacion(val);
        setValidationError('');
      } else {
        setFechaPendienteAutorizar(val);
        setOscarAuthError('');
        setOscarPasswordInput('');
        setOscarJustificacionInput('');
        setShowOscarAuthModal(true);
      }
      return;
    }

    // 3. Rango permitido estándar [fiveDaysAgoStr, todayStr]
    setFechaOperacion(val);
    setValidationError('');
  };

  const handleConfirmOscarAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!oscarPasswordInput.trim()) {
      setOscarAuthError('Por favor ingresa la contraseña del Administrador Oscar Mercado.');
      return;
    }

    setOscarAuthLoading(true);
    setOscarAuthError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroEmpleado: '1000',
          password: oscarPasswordInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOscarAuthError(
          data.error || 'Credenciales inválidas. Solo el Administrador Oscar Mercado tiene autorización para habilitar encuestas atrasadas.'
        );
        return;
      }

      setAdminAuthOscar({
        autorizado: true,
        password: oscarPasswordInput.trim(),
        token: data.token,
        justificacion: oscarJustificacionInput.trim() || 'Autorizado por Administrador General Oscar Mercado',
        autorizadaEn: new Date().toISOString(),
      });

      const todayStr = getTodayFormatted();
      if (fechaPendienteAutorizar && fechaPendienteAutorizar <= todayStr) {
        setFechaOperacion(fechaPendienteAutorizar);
      }
      setShowOscarAuthModal(false);
      setValidationError('');
    } catch {
      setOscarAuthError('Error de conexión al validar credenciales con el servidor.');
    } finally {
      setOscarAuthLoading(false);
    }
  };

  const handleIniciarChecklist = () => {
    if (!empleadoEncontrado || preguntasArea.length === 0) return;

    const todayStr = getTodayFormatted();
    const fiveDaysAgoStr = getOffsetDateFormatted(-5);

    // Validación estricta de fechas al iniciar
    if (fechaOperacion > todayStr) {
      setValidationError(
        `Política de Fechas: No es posible iniciar el checklist con una fecha futura (${fechaOperacion}). Selecciona hoy (${todayStr}) o una fecha anterior.`
      );
      setFechaOperacion(todayStr);
      return;
    }

    if (fechaOperacion < fiveDaysAgoStr && !adminAuthOscar) {
      setFechaPendienteAutorizar(fechaOperacion);
      setOscarAuthError('');
      setOscarPasswordInput('');
      setOscarJustificacionInput('');
      setShowOscarAuthModal(true);
      return;
    }

    clearAutoAdvanceTimer();
    stopCamera();

    const initialAnswers: Record<number, DraftAnswer> = {};
    preguntasArea.forEach((p) => {
      initialAnswers[p.id] = {
        preguntaId: p.id,
        respuesta: null,
        motivoNo: '',
      };
    });

    setAnswers(initialAnswers);
    setCurrentIndex(0);
    setCardDirection(1);
    setValidationError('');
    setStartTimeMs(Date.now());
    setStep('preguntas');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  };

  const handleSelectAnswer = (pregunta: Pregunta, value: boolean) => {
    clearAutoAdvanceTimer();
    setValidationError('');

    if (value === true && activeCameraQuestionId === pregunta.id) {
      stopCamera();
    }

    setAnswers((prev) => {
      const current = prev[pregunta.id] || {
        preguntaId: pregunta.id,
        respuesta: null,
        motivoNo: '',
      };
      return {
        ...prev,
        [pregunta.id]: {
          ...current,
          respuesta: value,
          motivoNo: value ? '' : current.motivoNo,
          evidencia: value ? undefined : current.evidencia,
        },
      };
    });

    // Si la respuesta es "Sí", avanza suavemente a la siguiente tarjeta (flujo de 1 clic)
    if (value === true && displayMode === 'single') {
      const answeredIdx = preguntasArea.findIndex((p) => p.id === pregunta.id);
      if (answeredIdx !== -1 && answeredIdx < preguntasArea.length - 1) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          autoAdvanceTimerRef.current = null;
          setCardDirection(1);
          setCurrentIndex((idx) =>
            idx === answeredIdx && idx < preguntasArea.length - 1 ? idx + 1 : idx
          );
        }, 180);
      }
    }
  };

  const handleMotivoChange = (preguntaId: number, text: string) => {
    if (validationError) setValidationError('');
    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        motivoNo: text,
      },
    }));
  };

  const processEvidenceFile = (
    preguntaId: number,
    file: File,
    origen: CaptureOrigin
  ) => {
    setValidationError('');

    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    let detectedFormat: ImageFormat | null = ALLOWED_MIMES[mime] || null;

    if (!detectedFormat) {
      if (ext === 'JPG' || ext === 'JPEG') detectedFormat = 'JPG';
      else if (ext === 'PNG') detectedFormat = 'PNG';
      else if (ext === 'WEBP') detectedFormat = 'WEBP';
    }

    if (!detectedFormat) {
      setValidationError(
        `El archivo "${file.name}" no tiene un formato válido. Sube una imagen en formato JPG, PNG o WEBP.`
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError('La fotografía supera el límite de 10 MB. Selecciona un archivo más ligero.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setAnswers((prev) => ({
        ...prev,
        [preguntaId]: {
          ...prev[preguntaId],
          evidencia: {
            nombreArchivo: file.name,
            formato: detectedFormat!,
            mimeType: mime || `image/${detectedFormat!.toLowerCase()}`,
            tamanoBytes: file.size,
            dataUrl,
            origenCaptura: origen,
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const confirmRemoveEvidence = () => {
    if (confirmRemoveQuestionId === null) return;
    setAnswers((prev) => ({
      ...prev,
      [confirmRemoveQuestionId]: {
        ...prev[confirmRemoveQuestionId],
        evidencia: undefined,
      },
    }));
    setConfirmRemoveQuestionId(null);
  };

  const canAdvanceFromQuestion = (pregunta: Pregunta | undefined): boolean => {
    if (!pregunta) return false;
    const ans = answers[pregunta.id];
    if (!ans || ans.respuesta === null) {
      setValidationError('Selecciona "Sí, Cumple" o "No Cumple" en esta tarjeta antes de avanzar.');
      return false;
    }
    if (ans.respuesta === false && !ans.motivoNo.trim()) {
      setValidationError(
        'El motivo de la respuesta negativa es obligatorio. Escribe la causa o elige una opción rápida antes de continuar.'
      );
      return false;
    }
    return true;
  };

  const handleNextCard = () => {
    clearAutoAdvanceTimer();
    const currentQ = preguntasArea[currentIndex];
    if (!canAdvanceFromQuestion(currentQ)) return;
    stopCamera();
    setValidationError('');
    if (currentIndex < preguntasArea.length - 1) {
      setCardDirection(1);
      setCurrentIndex((prev) => Math.min(prev + 1, preguntasArea.length - 1));
    }
  };

  const handlePrevCard = () => {
    clearAutoAdvanceTimer();
    stopCamera();
    setValidationError('');
    if (currentIndex > 0) {
      setCardDirection(-1);
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    clearAutoAdvanceTimer();
    stopCamera();
    setValidationError('');
    setCardDirection(targetIdx >= currentIndex ? 1 : -1);
    setCurrentIndex(targetIdx);
    if (displayMode === 'grouped') {
      const targetQuestion = preguntasArea[targetIdx];
      if (targetQuestion && typeof document !== 'undefined') {
        const el = document.getElementById(`question-card-${targetQuestion.id}`);
        el?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
    }
  };

  // Navegación por teclado (Flechas Izquierda / Derecha y Escape)
  useEffect(() => {
    if (step !== 'preguntas') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmSubmitModal) {
          setShowConfirmSubmitModal(false);
          return;
        }
        if (confirmRemoveQuestionId !== null) {
          setConfirmRemoveQuestionId(null);
          return;
        } else if (activeCameraQuestionId !== null) {
          stopCamera();
          return;
        }
        return;
      }

      if (displayMode !== 'single') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Validación previa antes de abrir el modal de confirmación final
  const handleRequestSubmit = () => {
    clearAutoAdvanceTimer();
    stopCamera();
    setValidationError('');

    for (let i = 0; i < preguntasArea.length; i++) {
      const q = preguntasArea[i];
      const ans = answers[q.id];
      if (!ans || ans.respuesta === null) {
        setCurrentIndex(i);
        setValidationError(
          `La tarjeta #${i + 1} (${q.codigo}) aún no tiene respuesta. Selecciona Sí o No antes de continuar.`
        );
        return;
      }
      if (ans.respuesta === false && !ans.motivoNo.trim()) {
        setCurrentIndex(i);
        setValidationError(
          `En la tarjeta #${i + 1} (${q.codigo}) indicaste "No Cumple". Es obligatorio capturar el motivo o explicación.`
        );
        return;
      }
    }

    if (!empleadoEncontrado) return;

    // Despliega el modal de confirmación y revisión de respuestas antes del guardado definitivo
    setShowConfirmSubmitModal(true);
  };

  // Transmisión definitiva a la API tras confirmación del jefe de departamento / usuario
  const executeConfirmSubmit = async () => {
    if (!empleadoEncontrado) return;

    setSubmitting(true);
    try {
      const elapsedSeconds = Math.max(5, Math.round((Date.now() - startTimeMs) / 1000));
      const payload = {
        numeroEmpleado: empleadoEncontrado.numeroEmpleado,
        areaId: areaEncontrada?.id,
        fechaOperacion,
        duracionSegundos: elapsedSeconds,
        dispositivo:
          typeof window !== 'undefined' && window.innerWidth < 768
            ? 'Dispositivo Móvil / Touch'
            : 'Escritorio / Web App',
        autorizacionAdmin: adminAuthOscar
          ? {
              adminNumeroEmpleado: '1000',
              password: adminAuthOscar.password,
              token: adminAuthOscar.token,
              justificacion: adminAuthOscar.justificacion,
            }
          : undefined,
        respuestas: preguntasArea.map((q) => {
          const a = answers[q.id];
          return {
            preguntaId: q.id,
            preguntaCodigo: q.codigo,
            respuesta: Boolean(a.respuesta),
            motivoNo: a.respuesta === false ? a.motivoNo.trim() : undefined,
            evidencia: a.respuesta === false ? a.evidencia : undefined,
          };
        }),
      };

      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setShowConfirmSubmitModal(false);
        setValidationError(data.error || 'No se pudo guardar el checklist.');
        return;
      }

      setShowConfirmSubmitModal(false);
      setCompletedRecord(data.checklist);
      setStep('completado');
      onChecklistCompleted(data.checklist);
    } catch {
      setShowConfirmSubmitModal(false);
      setValidationError('Error de conexión al guardar el checklist. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cálculo de barra de progreso visual
  const totalQuestions = preguntasArea.length;
  const answeredCount = preguntasArea.filter((q) => {
    const a = answers[q.id];
    if (!a || a.respuesta === null) return false;
    if (a.respuesta === false && !a.motivoNo.trim()) return false;
    return true;
  }).length;
  const progressRatio = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const renderQuestionCard = (pregunta: Pregunta, index: number) => {
    const ans = answers[pregunta.id] || {
      preguntaId: pregunta.id,
      respuesta: null,
      motivoNo: '',
    };
    const isYes = ans.respuesta === true;
    const isNo = ans.respuesta === false;
    const isDragOver = dragOverQuestionId === pregunta.id;

    const criticidadBadge = {
      CRITICA: 'bg-rose-50 text-rose-700 border-rose-200',
      ALTA: 'bg-amber-50 text-amber-800 border-amber-200',
      MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
      BAJA: 'bg-slate-100 text-slate-700 border-slate-200',
    }[pregunta.criticidad];

    return (
      <div
        id={`question-card-${pregunta.id}`}
        key={pregunta.id}
        className={cn(
          'bg-white rounded-2xl border transition-colors shadow-sm overflow-hidden',
          isYes
            ? 'border-emerald-500'
            : isNo
            ? 'border-rose-500'
            : 'border-slate-200'
        )}
      >
        {/* Cabecera de la tarjeta */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-blue-600 text-white font-bold text-sm tabular-nums">
              {index + 1}
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="font-mono font-bold text-blue-700">
                {pregunta.codigo}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700">{pregunta.categoria}</span>
            </div>
          </div>

          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-md border',
              criticidadBadge
            )}
          >
            Criticidad: {pregunta.criticidad}
          </span>
        </div>

        {/* Cuerpo de la pregunta */}
        <div className="p-6 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 text-balance mb-3">
            {pregunta.texto}
          </h3>

          {pregunta.descripcionAyuda && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm mb-6">
              <HelpCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-pretty">{pregunta.descripcionAyuda}</p>
            </div>
          )}

          {/* Botones Grandes, Modernos y Táctiles: Sí / No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.12 }}
              onClick={() => handleSelectAnswer(pregunta, true)}
              className={cn(
                'relative flex items-center justify-center gap-3 py-5 px-6 rounded-xl font-bold text-lg border-2 transition-colors',
                isYes
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400'
              )}
            >
              <CheckCircle2
                className={cn(
                  'size-6 shrink-0',
                  isYes ? 'text-white' : 'text-emerald-600'
                )}
              />
              <span>Sí, Cumple</span>
              {isYes && (
                <span className="ml-1 bg-emerald-800 text-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
                  Activo
                </span>
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.12 }}
              onClick={() => handleSelectAnswer(pregunta, false)}
              className={cn(
                'relative flex items-center justify-center gap-3 py-5 px-6 rounded-xl font-bold text-lg border-2 transition-colors',
                isNo
                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950 hover:bg-rose-100 hover:border-rose-400'
              )}
            >
              <XCircle
                className={cn(
                  'size-6 shrink-0',
                  isNo ? 'text-white' : 'text-rose-600'
                )}
              />
              <span>No Cumple</span>
              {isNo && (
                <span className="ml-1 bg-rose-800 text-rose-50 px-2 py-0.5 rounded text-xs font-semibold">
                  Incidencia
                </span>
              )}
            </motion.button>
          </div>

          {/* Formulario Adicional Automático cuando la respuesta es "No" */}
          <AnimatePresence initial={false}>
            {isNo && (
              <motion.div
                key={`no-panel-${pregunta.id}`}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mt-6 pt-6 border-t border-rose-200 bg-rose-50/40 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 sm:p-8"
              >
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm mb-4">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0" />
                  <span>Detalle de Incidencia por Respuesta Negativa</span>
                </div>

                {/* 1. Motivo o explicación del "No" (OBLIGATORIO) */}
                <div className="mb-5">
                  <label
                    htmlFor={`motivo-${pregunta.id}`}
                    className="block text-sm font-bold text-slate-900 mb-2"
                  >
                    Motivo o explicación del &ldquo;No&rdquo;{' '}
                    <span className="text-rose-700 font-bold">(OBLIGATORIO *)</span>
                  </label>

                  {pregunta.sugerenciasMotivoNo && pregunta.sugerenciasMotivoNo.length > 0 && (
                    <div className="mb-2.5">
                      <p className="text-xs text-slate-600 mb-1.5 text-pretty">
                        Selecciona una causa frecuente con un clic o escribe el detalle completo abajo:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pregunta.sugerenciasMotivoNo.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleMotivoChange(pregunta.id, sug)}
                            className={cn(
                              'text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium',
                              ans.motivoNo === sug
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-rose-400 hover:bg-rose-50'
                            )}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    id={`motivo-${pregunta.id}`}
                    rows={3}
                    value={ans.motivoNo}
                    onChange={(e) => handleMotivoChange(pregunta.id, e.target.value)}
                    placeholder="Describe el hallazgo detectado por el cual no se cumple este punto..."
                    className={cn(
                      'w-full rounded-xl border-2 p-3.5 text-sm bg-white text-slate-900 placeholder:text-slate-500 transition-colors',
                      !ans.motivoNo.trim()
                        ? 'border-rose-300 focus:border-rose-600'
                        : 'border-emerald-500 focus:border-emerald-600'
                    )}
                  />
                  {!ans.motivoNo.trim() ? (
                    <p className="text-xs text-rose-700 font-medium mt-1.5 flex items-center gap-1.5 text-pretty">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>Es obligatorio registrar el motivo para poder guardar una respuesta negativa.</span>
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-800 font-semibold mt-1.5 flex items-center gap-1.5">
                      <Check className="size-3.5 shrink-0" />
                      <span>Motivo obligatorio registrado correctamente.</span>
                    </p>
                  )}
                </div>

                {/* 2. Fotografía de evidencia (OPCIONAL) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-slate-900">
                      Fotografía de evidencia{' '}
                      <span className="text-slate-600 font-normal">(Opcional)</span>
                    </span>
                    <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                      Formatos permitidos: JPG, PNG, WEBP
                    </span>
                  </div>

                  {activeCameraQuestionId === pregunta.id && (
                    <div className="mb-4 p-4 rounded-xl bg-slate-900 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-rose-500" />
                          <span>Cámara activa</span>
                        </span>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="text-xs text-slate-200 hover:text-white underline"
                        >
                          Cerrar cámara
                        </button>
                      </div>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-64 object-cover rounded-lg bg-black mb-3"
                      />
                      <button
                        type="button"
                        onClick={() => capturePhotoFromVideo(pregunta.id)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Camera className="size-4" />
                        <span>Capturar Fotografía</span>
                      </button>
                    </div>
                  )}

                  {ans.evidencia ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={ans.evidencia.dataUrl}
                        alt={`Evidencia cargada para ${pregunta.codigo}`}
                        className="w-full sm:w-32 h-28 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {ans.evidencia.nombreArchivo}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          Formato: <strong className="text-blue-700">{ans.evidencia.formato}</strong> •
                          Origen: <strong>{ans.evidencia.origenCaptura}</strong> •{' '}
                          {Math.max(1, Math.round(ans.evidencia.tamanoBytes / 1024))} KB
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md font-medium mt-2">
                          <CheckCircle2 className="size-3.5" /> Evidencia adjunta
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveQuestionId(pregunta.id)}
                        className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="size-4" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverQuestionId(pregunta.id);
                      }}
                      onDragLeave={() => setDragOverQuestionId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverQuestionId(null);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          processEvidenceFile(pregunta.id, file, 'DRAG_DROP');
                        }
                      }}
                      className={cn(
                        'rounded-xl border-2 border-dashed p-5 text-center transition-colors',
                        isDragOver
                          ? 'border-blue-600 bg-blue-50/70'
                          : 'border-slate-300 bg-white hover:border-blue-400'
                      )}
                    >
                      <ImageIcon className="size-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800 text-pretty">
                        Arrastra y suelta una fotografía aquí
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 mb-4 text-pretty">
                        o captura la evidencia desde cámara móvil o galería:
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => startLiveCamera(pregunta.id)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          <Camera className="size-4" />
                          <span>Tomar Foto con Cámara</span>
                        </button>

                        <input
                          id={`camera-input-${pregunta.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processEvidenceFile(pregunta.id, file, 'CAMARA');
                          }}
                        />

                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border border-slate-300 transition-colors">
                          <Upload className="size-4 text-blue-600" />
                          <span>Cargar desde Galería</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) processEvidenceFile(pregunta.id, file, 'GALERIA');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PASO 1: PANTALLA DE IDENTIFICACIÓN DEL USUARIO (Sección 2)
  // ============================================================================
  if (step === 'identificacion') {
    const canStart = Boolean(empleadoEncontrado && preguntasArea.length > 0);

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-7 sm:px-10 text-white border-b border-slate-800">
            <h1 className="text-2xl sm:text-3xl font-bold text-balance">
              Iniciar Nuevo Checklist Operativo
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl text-pretty">
              Ingresa tu número de empleado para cargar las tarjetas de tu área asignada (MES, Ind. 4.0, Infraestructura, Staff IT, Digitalizacion, SAP o Soporte Manufactura).
            </p>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            {/* Selector rápido de jefes de departamento y personal operativo */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">
                Selección rápida de personal y jefes de área (1 clic):
              </p>
              <div className="flex flex-wrap gap-2">
                {catalogoEmpleados
                  .filter((emp) => emp.rolCodigo !== 'ADMIN')
                  .slice(0, 8)
                  .map((emp) => {
                  const selected = numeroEmpleadoInput === emp.numeroEmpleado;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setNumeroEmpleadoInput(emp.numeroEmpleado)}
                      className={cn(
                        'text-xs px-3 py-2 rounded-lg border font-semibold transition-colors flex items-center gap-2 tabular-nums',
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      )}
                    >
                      <span className="font-mono font-bold">#{emp.numeroEmpleado}</span>
                      <span>{emp.nombreCompleto.split(' ').slice(0, 2).join(' ')}</span>
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded',
                          selected
                            ? 'bg-blue-800 text-blue-50'
                            : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {emp.areaNombre}{emp.areaNombreSecundaria ? ` / ${emp.areaNombreSecundaria}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de campos solicitados: Número de Empleado y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="input-numero-empleado"
                  className="block text-sm font-bold text-slate-900 mb-2"
                >
                  Número de Empleado <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-numero-empleado"
                    type="text"
                    value={numeroEmpleadoInput}
                    onChange={(e) => setNumeroEmpleadoInput(e.target.value)}
                    placeholder="Ej. 1001, 2001, 2002..."
                    className="w-full rounded-xl border-2 border-slate-300 focus:border-blue-600 px-4 py-3 text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-500 tabular-nums transition-colors"
                  />
                  {buscandoEmpleado && (
                    <RefreshCw className="size-5 text-blue-600 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {errorBusqueda && (
                  <p className="text-xs text-rose-700 font-medium mt-1.5 text-pretty">
                    {errorBusqueda}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <label
                    htmlFor="input-fecha-operacion"
                    className="block text-sm font-bold text-slate-900"
                  >
                    Fecha de Operación{' '}
                    <span className="text-xs font-normal text-slate-600">
                      {adminAuthOscar ? '(Atrasada Autorizada)' : '(Hoy o últimos 5 días)'}
                    </span>
                  </label>
                  {adminAuthOscar ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="size-3 text-emerald-600" />
                      <span>Autorizado por Oscar Mercado</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const fiveDaysAgoStr = getOffsetDateFormatted(-5);
                        setFechaPendienteAutorizar(fechaOperacion < fiveDaysAgoStr ? fechaOperacion : fiveDaysAgoStr);
                        setOscarAuthError('');
                        setOscarPasswordInput('');
                        setOscarJustificacionInput('');
                        setShowOscarAuthModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <Lock className="size-3" />
                      <span>Habilitar fecha atrasada (&gt; 5 días)</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="size-5 text-blue-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-fecha-operacion"
                    type="date"
                    value={fechaOperacion}
                    max={getTodayFormatted()}
                    min={adminAuthOscar ? undefined : getOffsetDateFormatted(-5)}
                    onChange={handleFechaChange}
                    className="w-full rounded-xl border-2 border-slate-300 focus:border-blue-600 pl-12 pr-4 py-3 text-base font-semibold text-slate-900 tabular-nums transition-colors"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                  <span>
                    Rango estándar: <strong>{getOffsetDateFormatted(-5)}</strong> a <strong>{getTodayFormatted()}</strong> (No se permiten fechas futuras).
                  </span>
                  {adminAuthOscar && (
                    <span className="text-emerald-700 font-semibold">
                      Permiso concedido para fechas anteriores a 5 días.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de Autocompletado Inteligente separada por divisores limpios (sin tarjetas anidadas) */}
            <div className="border-y border-slate-200 py-5">
              {empleadoEncontrado ? (
                <motion.div
                  key={empleadoEncontrado.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-11 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <UserCheck className="size-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-blue-800 block">
                        Nombre del Empleado
                      </span>
                      <p className="text-lg font-bold text-slate-900">
                        {empleadoEncontrado.nombreCompleto}
                      </p>
                      <p className="text-xs text-slate-600">
                        {empleadoEncontrado.puesto || 'Especialista Operativo'} • Rol:{' '}
                        {empleadoEncontrado.rolCodigo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div
                      className="size-11 rounded-lg text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: areaEncontrada?.colorHex || '#2563EB' }}
                    >
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">
                        Área Correspondiente
                      </span>
                      <p className="text-lg font-bold text-slate-900">
                        {areaEncontrada?.nombre || empleadoEncontrado.areaNombre}
                      </p>
                      <p className="text-xs text-slate-600 tabular-nums">
                        {preguntasArea.length} tarjetas de verificación asignadas
                      </p>
                    </div>
                  </div>

                  {areasAsignadas.length > 1 && (
                    <div className="col-span-1 sm:col-span-2 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="size-4 text-blue-600" />
                          <span>Empleado asignado a múltiples áreas ({areasAsignadas.length} de máx. 2) — Selecciona área a evaluar:</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">Límite: 2 áreas</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {areasAsignadas.map((a) => {
                          const isSelected = areaEncontrada?.id === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleCambiarArea(a)}
                              className={cn(
                                'px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-2',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                              )}
                            >
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: isSelected ? '#ffffff' : a.colorHex }}
                              />
                              <span>{a.nombre}</span>
                              {isSelected ? (
                                <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                                  <Check className="size-3" /> Seleccionada
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-normal">Cambiar</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="py-2 text-slate-600 text-sm text-pretty">
                  Ingresa un <strong>Número de Empleado</strong> o elige uno de los botones superiores para autocompletar su <strong>Nombre</strong> y <strong>Área</strong>.
                </div>
              )}
            </div>

            {/* Botón de inicio de checklist (sin conflicto gray-on-color) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>Flujo rápido por tarjetas con validación en tiempo real</span>
              </div>

              <button
                type="button"
                disabled={!canStart}
                onClick={handleIniciarChecklist}
                className={cn(
                  'w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl font-bold text-base transition-colors motion-safe:active:scale-[0.98]',
                  canStart
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                )}
              >
                <span>Comenzar Checklist Ahora</span>
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Autorización de Oscar Mercado para Fechas Atrasadas (> 5 días) */}
        {showOscarAuthModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="oscar-auth-title"
            onClick={() => {
              setShowOscarAuthModal(false);
              const fiveDaysAgoStr = getOffsetDateFormatted(-5);
              if (fechaOperacion < fiveDaysAgoStr && !adminAuthOscar) {
                setFechaOperacion(getTodayFormatted());
              }
            }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Encabezado del Modal */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldAlert className="size-5" />
                  </div>
                  <div>
                    <h3 id="oscar-auth-title" className="font-bold text-sm">
                      Autorización de Administrador
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Habilitación de Encuesta Atrasada (&gt; 5 días)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar modal de autorización"
                  onClick={() => {
                    setShowOscarAuthModal(false);
                    const fiveDaysAgoStr = getOffsetDateFormatted(-5);
                    if (fechaOperacion < fiveDaysAgoStr && !adminAuthOscar) {
                      setFechaOperacion(getTodayFormatted());
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleConfirmOscarAuth} className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">
                      Fecha solicitada:
                    </span>
                    <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                      {fechaPendienteAutorizar || fechaOperacion}
                    </span>
                  </div>
                  <p className="text-amber-800 text-pretty">
                    Esta fecha supera los <strong>5 días</strong> de antigüedad permitidos. Únicamente el Administrador General <strong>Oscar Mercado</strong> puede autorizar encuestas atrasadas.
                  </p>
                  <p className="text-[11px] text-amber-900 font-semibold pt-1 border-t border-amber-200">
                    ⚠️ Regla estricta: Bajo ninguna circunstancia se permite adelantar fecha o habilitar días futuros.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrador Autorizador
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                    Oscar Mercado (#1000 - Administrador General de Sistemas)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña de Administrador (Oscar Mercado) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      autoFocus
                      value={oscarPasswordInput}
                      onChange={(e) => setOscarPasswordInput(e.target.value)}
                      placeholder="Ingresa contraseña de Administrador..."
                      className="w-full rounded-xl border border-slate-300 focus:border-blue-600 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo o Justificación de Encuesta Atrasada
                  </label>
                  <input
                    type="text"
                    value={oscarJustificacionInput}
                    onChange={(e) => setOscarJustificacionInput(e.target.value)}
                    placeholder="Ej: Levantamiento extemporáneo por auditoría o falla técnica"
                    className="w-full rounded-xl border border-slate-300 focus:border-blue-600 px-3.5 py-2.5 text-xs font-medium text-slate-900"
                  />
                </div>

                {oscarAuthError && (
                  <p className="text-xs text-rose-700 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-200">
                    {oscarAuthError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOscarAuthModal(false);
                      const fiveDaysAgoStr = getOffsetDateFormatted(-5);
                      if (fechaOperacion < fiveDaysAgoStr && !adminAuthOscar) {
                        setFechaOperacion(getTodayFormatted());
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={oscarAuthLoading || !oscarPasswordInput.trim()}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    {oscarAuthLoading ? 'Verificando...' : 'Autorizar Encuesta Atrasada'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // PASO 2: EJECUCIÓN DEL CHECKLIST BASADO EN TARJETAS (Secciones 1, 3 y 4)
  // ============================================================================
  if (step === 'preguntas' && empleadoEncontrado) {
    const safeCurrentIndex = Math.min(currentIndex, Math.max(0, preguntasArea.length - 1));
    const activeQuestion = preguntasArea[safeCurrentIndex];

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Barra Superior de Contexto + Selector de Modo + Barra de Progreso Visual */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Volver a selección de empleado y fecha"
                onClick={() => {
                  clearAutoAdvanceTimer();
                  stopCamera();
                  setValidationError('');
                  setStep('identificacion');
                }}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Cambiar empleado o fecha"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 tabular-nums">
                    #{empleadoEncontrado.numeroEmpleado}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {empleadoEncontrado.nombreCompleto}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  Área: <strong className="text-slate-900">{empleadoEncontrado.areaNombre}</strong> • Fecha:{' '}
                  <strong>{fechaOperacion}</strong>
                  {adminAuthOscar && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <ShieldCheck className="size-3 text-amber-600" />
                      <span>Atrasada (Autorizado por Oscar Mercado)</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Selector de vista: Una tarjeta a la vez vs Tarjetas agrupadas */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  clearAutoAdvanceTimer();
                  setDisplayMode('single');
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
                  displayMode === 'single'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                )}
              >
                <CreditCard className="size-3.5" />
                <span>1 a la vez</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAutoAdvanceTimer();
                  setDisplayMode('grouped');
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors tabular-nums',
                  displayMode === 'grouped'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                )}
              >
                <Layers className="size-3.5" />
                <span>Agrupadas ({totalQuestions})</span>
              </button>
            </div>
          </div>

          {/* Barra de Progreso Visual Interactiva animada por transform scaleX (compositor only) */}
          <div className="pt-4">
            <div className="flex items-center justify-between text-xs font-bold mb-2 tabular-nums">
              <span className="text-slate-700">
                Progreso del Checklist ({answeredCount} de {totalQuestions} completadas)
              </span>
              <span className="text-blue-700 text-sm font-bold">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                className="h-full w-full bg-blue-600 origin-left"
                initial={false}
                animate={{ scaleX: progressRatio }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.01 }
                    : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                }
              />
            </div>

            {/* Píldoras de navegación rápida por tarjeta */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {preguntasArea.map((q, idx) => {
                const a = answers[q.id];
                const isCurrent = displayMode === 'single' && idx === safeCurrentIndex;
                let pillStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80';
                if (a?.respuesta === true) {
                  pillStyle = 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100';
                } else if (a?.respuesta === false) {
                  pillStyle = a.motivoNo.trim()
                    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5 tabular-nums motion-safe:active:scale-[0.97]',
                      pillStyle,
                      isCurrent && 'ring-2 ring-blue-600 ring-offset-1'
                    )}
                  >
                    <span>#{idx + 1}</span>
                    {a?.respuesta === true && (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    )}
                    {a?.respuesta === false && (
                      <XCircle className="size-3.5 text-rose-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerta de Validación contextual */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              role="alert"
              className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex items-start gap-3 text-rose-900 shadow-sm"
            >
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm font-semibold text-pretty">{validationError}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Renderizado de Tarjetas según el modo elegido */}
        {displayMode === 'single' ? (
          <>
            {activeQuestion && (
              <motion.div
                key={activeQuestion.id}
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, x: cardDirection * 18 }
                }
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderQuestionCard(activeQuestion, safeCurrentIndex)}
              </motion.div>
            )}

            {/* Controles de navegación entre tarjetas y guardado final */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handlePrevCard}
                disabled={safeCurrentIndex === 0}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-sm transition-colors motion-safe:active:scale-[0.98]',
                  safeCurrentIndex === 0
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                )}
              >
                <ArrowLeft className="size-4" />
                <span>Tarjeta Anterior</span>
              </button>

              {safeCurrentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleNextCard}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors motion-safe:active:scale-[0.98]"
                >
                  <span>Siguiente Tarjeta</span>
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm transition-colors motion-safe:active:scale-[0.98]"
                >
                  <CheckCircle2 className="size-5" />
                  <span>Finalizar y Guardar Checklist</span>
                </button>
              )}
            </div>

            {answeredCount === totalQuestions && safeCurrentIndex < totalQuestions - 1 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-emerald-950 text-sm font-semibold">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <span>Todas las tarjetas están completas. Puedes revisar y enviar el checklist ahora.</span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
                >
                  Revisar y Enviar Checklist
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {preguntasArea.map((q, idx) => renderQuestionCard(q, idx))}

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-base font-bold text-slate-900 tabular-nums">
                  {answeredCount} de {totalQuestions} puntos completados ({progressPercent}%)
                </p>
                <p className="text-xs text-slate-600 text-pretty">
                  Confirma que cualquier respuesta negativa tenga su motivo obligatorio antes de guardar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestSubmit}
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm transition-colors"
              >
                <CheckCircle2 className="size-5" />
                <span>Finalizar y Guardar Checklist</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal de Confirmación y Revisión de Respuestas antes de Enviar */}
        {showConfirmSubmitModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-submit-title"
            aria-describedby="confirm-submit-desc"
            onClick={() => setShowConfirmSubmitModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-7 border border-slate-200 shadow-2xl space-y-4 my-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start gap-3.5 pb-3 border-b border-slate-200 shrink-0">
                <div className="size-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <HelpCircle className="size-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                      Confirmación de Envío
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Destinatario: Oscar Mercado (Administrador)
                    </span>
                  </div>
                  <h3 id="confirm-submit-title" className="text-xl font-bold text-slate-900 mt-1 text-balance">
                    ¿Estás seguro de que ya deseas enviar el checklist?
                  </h3>
                  <p id="confirm-submit-desc" className="text-xs text-slate-600 mt-0.5 text-pretty">
                    Revisa tus respuestas antes de la transmisión definitiva. Si necesitas modificar alguna, pulsa <strong>"Cambiar"</strong>.
                  </p>
                </div>
              </div>

              {/* Resumen de Datos Operativos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs shrink-0">
                <div>
                  <span className="text-slate-500 block">Jefe / Empleado:</span>
                  <strong className="text-slate-900 font-bold truncate block">
                    {empleadoEncontrado?.nombreCompleto}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Área:</span>
                  <strong className="text-slate-900 font-bold block">
                    {empleadoEncontrado?.areaNombre}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Evaluado:</span>
                  <strong className="text-slate-900 font-bold block">
                    {preguntasArea.length} Tarjetas
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Fecha:</span>
                  <strong className="text-slate-900 font-bold block">
                    {fechaOperacion}
                  </strong>
                  {adminAuthOscar && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 block truncate mt-0.5">
                      Autorizada Oscar M.
                    </span>
                  )}
                </div>
              </div>

              {/* Tarjetas de conteo rápido Sí / No */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">Respuestas "Sí, Cumple"</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-800 tabular-nums">
                    {preguntasArea.filter((q) => answers[q.id]?.respuesta === true).length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-950">Respuestas "No Cumple"</span>
                  </div>
                  <span className="text-lg font-bold text-rose-800 tabular-nums">
                    {preguntasArea.filter((q) => answers[q.id]?.respuesta === false).length}
                  </span>
                </div>
              </div>

              {/* Desglose de Preguntas con opción de cambiar respuestas */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-3 bg-slate-50/50 min-h-[140px]">
                <p className="text-xs font-bold text-slate-700 px-1 mb-1">
                  Detalle de respuestas (haz clic en "Cambiar" para modificar cualquiera):
                </p>
                {preguntasArea.map((q, idx) => {
                  const ans = answers[q.id];
                  const isYes = ans?.respuesta === true;
                  return (
                    <div
                      key={q.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            #{idx + 1} {q.codigo}
                          </span>
                          <span className="text-slate-900 font-semibold text-pretty line-clamp-1">
                            {q.texto}
                          </span>
                        </div>
                        {ans?.respuesta === false && (
                          <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded border border-rose-100 flex items-start gap-1.5 mt-1">
                            <span className="font-bold shrink-0">Motivo:</span>
                            <span className="text-pretty">{ans.motivoNo}</span>
                            {ans.evidencia && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                <Camera className="size-3" /> Foto adjunta
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {isYes ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            <CheckCircle2 className="size-3.5 text-emerald-600" /> Sí, Cumple
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                            <XCircle className="size-3.5 text-rose-600" /> No Cumple
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmSubmitModal(false);
                            setDisplayMode('single');
                            handleJumpToQuestion(idx);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-bold transition-colors"
                          title="Cambiar la respuesta de esta tarjeta"
                        >
                          <Edit3 className="size-3" />
                          <span>Cambiar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botones de Confirmación / Volver */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmitModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                >
                  Revisar o Cambiar Respuestas
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeConfirmSubmit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors motion-safe:active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Guardando y enviando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Sí, Seguro: Enviar Definitivamente</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AlertDialog accesible para confirmar eliminación de fotografía adjunta */}
        {confirmRemoveQuestionId !== null && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-evidence-title"
            aria-describedby="remove-evidence-desc"
            onClick={() => setConfirmRemoveQuestionId(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
            >
              <h4 id="remove-evidence-title" className="text-lg font-bold text-slate-900 text-balance">
                ¿Quitar fotografía de evidencia?
              </h4>
              <p id="remove-evidence-desc" className="text-sm text-slate-600 text-pretty">
                La imagen seleccionada se desvinculará de esta respuesta negativa. Podrás adjuntar otra fotografía si lo deseas.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveQuestionId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveEvidence}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Sí, quitar fotografía
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // PASO 3: PANTALLA DE CONFIRMACIÓN Y RESUMEN EJECUTIVO DEL CHECKLIST
  // ============================================================================
  if (step === 'completado' && completedRecord) {
    return (
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-center p-8 sm:p-10">
          <div className="size-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="size-9" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
            Checklist Registrado con Éxito
          </h2>
          <p className="text-slate-600 text-sm mt-2 tabular-nums text-pretty">
            Folio <strong className="font-mono text-slate-900">{completedRecord.folio}</strong> • Empleado:{' '}
            <strong>{completedRecord.nombreEmpleado}</strong> (#{completedRecord.numeroEmpleado}) • Área:{' '}
            <strong>{completedRecord.areaNombre}</strong>
          </p>

          <div className="grid grid-cols-3 gap-3 my-8 tabular-nums">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-xs font-bold text-blue-800 block">Cumplimiento</span>
              <span className="text-2xl sm:text-3xl font-bold text-blue-950 mt-1 block">
                {completedRecord.porcentajeCumplimiento}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 block">Respuestas Sí</span>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-950 mt-1 block">
                {completedRecord.totalSi}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 block">Incidencias (No)</span>
              <span className="text-2xl sm:text-3xl font-bold text-rose-950 mt-1 block">
                {completedRecord.totalNo}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mb-8 tabular-nums">
            <Clock className="size-4 text-blue-600" />
            <span>Tiempo total de captura: {completedRecord.duracionSegundos} segundos</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setStep('identificacion');
                setCompletedRecord(null);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors"
            >
              Realizar Otro Checklist
            </button>

            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              Ver en Dashboard Ejecutivo
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
