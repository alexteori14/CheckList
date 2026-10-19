import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartCheck Enterprise | Sistema Inteligente de Checklist',
  description:
    'Plataforma empresarial de checklists inteligentes basados en tarjetas, analítica ejecutiva, KPIs en tiempo real y gestión de incidencias con evidencia fotográfica.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
