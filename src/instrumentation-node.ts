import { procesarEncuestasVencidas } from './lib/notifier';

const g = globalThis as unknown as { __smartcheckScheduler?: boolean };

if (!g.__smartcheckScheduler) {
  g.__smartcheckScheduler = true;
  const tick = async () => {
    try {
      await procesarEncuestasVencidas();
    } catch (e) {
      console.error('[SmartCheck] Error verificando encuestas vencidas:', e);
    }
  };
  // Revisa cada minuto si alguna ventana de tiempo de vida cerró con encuestas pendientes
  setTimeout(tick, 15000);
  setInterval(tick, 60000);
}
