'use client';

import React, { useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  CheckSquare,
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import ChecklistWizard from '@/components/ChecklistWizard';
import AdminDashboard from '@/components/AdminDashboard';
import ArchitectureView from '@/components/ArchitectureView';
import { cn } from '@/lib/utils';

type ActiveModule = 'checklist' | 'admin' | 'arquitectura';

const NAV_ITEMS: Array<{
  id: ActiveModule;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'checklist',
    label: 'Realizar Checklist',
    shortLabel: 'Checklist',
    icon: ClipboardCheck,
  },
  {
    id: 'admin',
    label: 'Dashboard (Oscar Mercado)',
    shortLabel: 'Admin (Oscar M.)',
    icon: LayoutDashboard,
  },
  {
    id: 'arquitectura',
    label: 'Arquitectura (19 Entregables)',
    shortLabel: 'Docs',
    icon: BookOpen,
  },
];

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveModule>('checklist');
  const shouldReduceMotion = useReducedMotion();

  const handleSelectModule = (nextView: ActiveModule) => {
    setActiveView(nextView);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      {/* Barra de Navegación Empresarial Superior */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Identidad de Marca */}
          <button
            type="button"
            onClick={() => handleSelectModule('checklist')}
            className="flex items-center gap-3 text-left rounded-xl focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Ir a Realizar Checklist"
          >
            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <CheckSquare className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">
                  SmartCheck
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-600 hidden sm:block text-pretty">
                Sistema Inteligente de Checklist • Infraestructura, Control y Mantenimiento
              </p>
            </div>
          </button>

          {/* Selector Principal de Módulo con Shared Layout de Framer Motion */}
          <LayoutGroup id="main-nav">
            <nav
              aria-label="Navegación principal"
              className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleSelectModule(item.id)}
                    className={cn(
                      'relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors motion-safe:active:scale-[0.98]',
                      isActive
                        ? 'text-white'
                        : 'text-slate-700 hover:text-slate-950'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-main-nav-pill"
                        className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0.01 }
                            : { type: 'spring', stiffness: 450, damping: 35 }
                        }
                      />
                    )}
                    <Icon className="relative z-10 size-4" />
                    <span className="relative z-10 hidden md:inline">{item.label}</span>
                    <span className="relative z-10 md:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          </LayoutGroup>
        </div>
      </header>

      {/* Contenido Principal con transición inmediata e interrumpible */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          key={activeView}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeView === 'checklist' && (
            <ChecklistWizard
              onChecklistCompleted={() => {}}
              onNavigateToDashboard={() => handleSelectModule('admin')}
            />
          )}

          {activeView === 'admin' && <AdminDashboard />}

          {activeView === 'arquitectura' && <ArchitectureView />}
        </motion.div>
      </main>

      {/* Pie de página corporativo */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>
              <strong className="text-slate-900">SmartCheck Enterprise v1.0</strong> — Seguridad JWT • PostgreSQL 3FN • Exportación PDF & Excel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-blue-600" />
            <span>Optimizado para Móvil, Tablet y Escritorio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
