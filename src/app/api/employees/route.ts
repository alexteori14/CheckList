import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, registerAudit } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { Area, Empleado, RoleCode } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = readDb();
  const { searchParams } = new URL(req.url);
  const numero = searchParams.get('numero');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  if (numero) {
    const cleanNum = numero.trim().replace(/^EMP-/i, '');
    const empleado = db.empleados.find(
      (e) =>
        (e.numeroEmpleado.toLowerCase() === cleanNum.toLowerCase() ||
          e.numeroEmpleado.toLowerCase() === numero.trim().toLowerCase()) &&
        (includeInactive || e.activo)
    );

    if (!empleado) {
      return NextResponse.json(
        { found: false, message: 'Número de empleado no encontrado o inactivo.' },
        { status: 404 }
      );
    }

    const area = db.areas.find((a) => a.id === empleado.areaId);
    const areaSec = empleado.areaIdSecundaria
      ? db.areas.find((a) => a.id === empleado.areaIdSecundaria)
      : null;
    const areasAsignadas: Area[] = [
      ...(area ? [area] : []),
      ...(areaSec ? [areaSec] : []),
    ];

    const preguntas = db.preguntas
      .filter((p) => p.areaId === empleado.areaId && p.activo)
      .sort((a, b) => a.orden - b.orden);

    const { passwordHash: _ph, ...safeEmpleado } = empleado;
    return NextResponse.json({
      found: true,
      empleado: safeEmpleado,
      area,
      areasAsignadas,
      preguntas,
    });
  }

  const list = db.empleados
    .filter((e) => includeInactive || e.activo)
    .map(({ passwordHash: _ph, ...rest }) => rest);

  return NextResponse.json({ empleados: list, areas: db.areas, roles: db.roles });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      numeroEmpleado,
      nombreCompleto,
      areaId,
      areaIdSecundaria,
      correo,
      puesto,
      rolCodigo,
      password,
    } = body;

    if (!numeroEmpleado || !String(numeroEmpleado).trim()) {
      return NextResponse.json(
        { error: 'El Número de empleado es obligatorio.' },
        { status: 400 }
      );
    }

    if (!nombreCompleto || !String(nombreCompleto).trim()) {
      return NextResponse.json(
        { error: 'El Nombre completo es obligatorio.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const cleanNumero = String(numeroEmpleado).trim();

    const exists = db.empleados.some(
      (e) => e.numeroEmpleado.toLowerCase() === cleanNumero.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: `El número de empleado "${cleanNumero}" ya está registrado.` },
        { status: 409 }
      );
    }

    const selectedArea =
      db.areas.find((a) => a.id === Number(areaId)) || db.areas[0];
    const secArea =
      areaIdSecundaria && Number(areaIdSecundaria) !== selectedArea.id
        ? db.areas.find((a) => a.id === Number(areaIdSecundaria))
        : null;
    const selectedRole: RoleCode =
      rolCodigo && ['ADMIN', 'SUPERVISOR', 'OPERADOR'].includes(rolCodigo)
        ? rolCodigo
        : 'OPERADOR';

    const nowIso = new Date().toISOString();
    const newEmpleado: Empleado = {
      id: `emp-${Date.now()}`,
      numeroEmpleado: cleanNumero,
      nombreCompleto: String(nombreCompleto).trim(),
      correo: correo ? String(correo).trim() : '',
      puesto: puesto ? String(puesto).trim() : 'Especialista de Área',
      areaId: selectedArea.id,
      areaNombre: selectedArea.nombre,
      areaIdSecundaria: secArea ? secArea.id : null,
      areaNombreSecundaria: secArea ? secArea.nombre : null,
      rolCodigo: selectedRole,
      activo: true,
      passwordHash: hashPassword(password ? String(password) : 'admin123'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.empleados.unshift(newEmpleado);

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'USUARIOS',
      accion: 'ALTA_USUARIO',
      entidad: 'Empleado',
      entidadId: newEmpleado.id,
      detalles: `Alta de empleado #${newEmpleado.numeroEmpleado} (${newEmpleado.nombreCompleto}) en área ${newEmpleado.areaNombre} con rol ${newEmpleado.rolCodigo}`,
    });

    writeDb(db);

    const { passwordHash: _ph, ...safeEmpleado } = newEmpleado;
    return NextResponse.json({ empleado: safeEmpleado }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Error al registrar el usuario.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      numeroEmpleado,
      nombreCompleto,
      areaId,
      areaIdSecundaria,
      correo,
      puesto,
      rolCodigo,
      activo,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del usuario para actualizar.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const idx = db.empleados.findIndex((e) => e.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    const current = db.empleados[idx];

    if (numeroEmpleado && numeroEmpleado !== current.numeroEmpleado) {
      const duplicate = db.empleados.some(
        (e) =>
          e.id !== id &&
          e.numeroEmpleado.toLowerCase() === String(numeroEmpleado).trim().toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ese número de empleado ya pertenece a otro registro.' },
          { status: 409 }
        );
      }
      current.numeroEmpleado = String(numeroEmpleado).trim();
    }

    if (nombreCompleto !== undefined) {
      current.nombreCompleto = String(nombreCompleto).trim();
    }
    if (correo !== undefined) {
      current.correo = String(correo).trim();
    }
    if (puesto !== undefined) {
      current.puesto = String(puesto).trim();
    }
    if (areaId !== undefined) {
      const area = db.areas.find((a) => a.id === Number(areaId));
      if (area) {
        current.areaId = area.id;
        current.areaNombre = area.nombre;
      }
    }
    if (areaIdSecundaria !== undefined) {
      if (areaIdSecundaria === null || areaIdSecundaria === 0 || areaIdSecundaria === '') {
        current.areaIdSecundaria = null;
        current.areaNombreSecundaria = null;
      } else {
        const areaSec = db.areas.find((a) => a.id === Number(areaIdSecundaria));
        if (areaSec && areaSec.id !== current.areaId) {
          current.areaIdSecundaria = areaSec.id;
          current.areaNombreSecundaria = areaSec.nombre;
        } else if (areaSec && areaSec.id === current.areaId) {
          current.areaIdSecundaria = null;
          current.areaNombreSecundaria = null;
        }
      }
    }
    if (rolCodigo !== undefined) {
      current.rolCodigo = rolCodigo as RoleCode;
    }
    if (typeof activo === 'boolean') {
      current.activo = activo;
    }

    current.updatedAt = new Date().toISOString();
    db.empleados[idx] = current;

    registerAudit(db, {
      actorIdentificador: 'Administrador',
      modulo: 'USUARIOS',
      accion: typeof activo === 'boolean' && !nombreCompleto ? (activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO') : 'EDITAR_USUARIO',
      entidad: 'Empleado',
      entidadId: current.id,
      detalles: `Actualización de usuario #${current.numeroEmpleado} (${current.nombreCompleto}) - Estado Activo: ${current.activo}`,
    });

    writeDb(db);

    const { passwordHash: _ph, ...safeEmpleado } = current;
    return NextResponse.json({ empleado: safeEmpleado });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el usuario.' },
      { status: 500 }
    );
  }
}
