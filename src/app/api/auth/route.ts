import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, registerAudit } from '@/lib/db';
import { signToken, verifyPassword, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numeroEmpleado, password } = body;

    if (!numeroEmpleado || !password) {
      return NextResponse.json(
        { error: 'Debe proporcionar número de empleado y contraseña.' },
        { status: 400 }
      );
    }

    const rawInput = String(numeroEmpleado).trim();
    const cleanNum = rawInput.replace(/^EMP-/i, '');
    const db = readDb();

    const empleado = db.empleados.find((e) => {
      const matchNum =
        e.numeroEmpleado.toLowerCase() === cleanNum.toLowerCase() ||
        e.numeroEmpleado.toLowerCase() === rawInput.toLowerCase();
      const matchEmail = Boolean(e.correo && e.correo.trim().toLowerCase() === rawInput.toLowerCase());
      const matchAlias =
        (cleanNum.toLowerCase() === 'admin' && e.numeroEmpleado === '1000') ||
        (cleanNum.toLowerCase() === 'oscar' && e.nombreCompleto.toLowerCase().includes('oscar mercado')) ||
        (cleanNum.toLowerCase() === 'oscar.mercado' && e.nombreCompleto.toLowerCase().includes('oscar mercado'));
      return matchNum || matchEmail || matchAlias;
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Usuario no encontrado. Verifique el número de empleado o correo electrónico.' },
        { status: 401 }
      );
    }

    if (!empleado.activo) {
      return NextResponse.json(
        { error: 'La cuenta de este usuario se encuentra desactivada.' },
        { status: 403 }
      );
    }

    // El Dashboard y la administración son exclusivos para el Administrador General (Oscar Mercado, emp #1000)
    if (empleado.numeroEmpleado !== '1000' && !empleado.nombreCompleto.toLowerCase().includes('oscar mercado')) {
      return NextResponse.json(
        {
          error:
            'Acceso exclusivo para el Administrador General (Oscar Mercado). Los jefes de departamento de Sistemas (Infraestructura, Control, Mantenimiento) responden sus checklists directamente en el módulo "Realizar Checklist".',
        },
        { status: 403 }
      );
    }

    const validPass = empleado.passwordHash
      ? verifyPassword(password, empleado.passwordHash)
      : password === 'admin123';

    if (!validPass) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    const payload = {
      id: empleado.id,
      numeroEmpleado: empleado.numeroEmpleado,
      nombreCompleto: empleado.nombreCompleto,
      areaId: empleado.areaId,
      areaNombre: empleado.areaNombre,
      rolCodigo: 'ADMIN' as const,
    };

    const token = await signToken(payload);

    registerAudit(db, {
      actorIdentificador: `${empleado.numeroEmpleado} - ${empleado.nombreCompleto}`,
      modulo: 'SEGURIDAD_JWT',
      accion: 'LOGIN_EXITOSO',
      entidad: 'Empleado',
      entidadId: empleado.id,
      detalles: `Inicio de sesión administrativo autorizado para el Administrador General ${empleado.nombreCompleto}`,
    });
    writeDb(db);

    const response = NextResponse.json({
      token,
      user: payload,
    });

    response.cookies.set('smartcheck_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Error interno en el servidor de autenticación.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cookieToken = req.cookies.get('smartcheck_token')?.value;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const user = await verifyToken(token);
  if (!user || user.rolCodigo !== 'ADMIN') {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  return NextResponse.json({ authenticated: true, user });
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('smartcheck_token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        const db = readDb();
        registerAudit(db, {
          actorIdentificador: `${user.numeroEmpleado} - ${user.nombreCompleto}`,
          modulo: 'SEGURIDAD_JWT',
          accion: 'LOGOUT',
          entidad: 'Empleado',
          entidadId: user.id,
          detalles: 'Cierre de sesión administrativo finalizado con éxito.',
        });
        writeDb(db);
      }
    }

    const response = NextResponse.json({
      authenticated: false,
      message: 'Sesión administrativa cerrada con éxito.',
    });

    response.cookies.set('smartcheck_token', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Error al cerrar la sesión administrativa.' },
      { status: 500 }
    );
  }
}
