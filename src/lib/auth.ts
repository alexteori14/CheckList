import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { RoleCode } from '@/types';

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'smartcheck-enterprise-secret-key-2026-prod-safe';
const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
const PASSWORD_SALT = 'smartcheck-salt-v1';

export interface JWTPayloadUser {
  id: string;
  numeroEmpleado: string;
  nombreCompleto: string;
  areaId: number;
  areaNombre: string;
  rolCodigo: RoleCode;
}

/**
 * Cifra contraseñas usando PBKDF2-SHA256
 */
export function hashPassword(plainPassword: string): string {
  return crypto
    .pbkdf2Sync(plainPassword, PASSWORD_SALT, 10000, 32, 'sha256')
    .toString('hex');
}

/**
 * Verifica contraseña contra su hash cifrado
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const hash = hashPassword(plainPassword);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Genera un token JWT firmado con expiración de 12 horas
 */
export async function signToken(payload: JWTPayloadUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('smartcheck-enterprise')
    .setExpirationTime('12h')
    .sign(secretKey);
}

/**
 * Verifica y decodifica un token JWT
 */
export async function verifyToken(token: string): Promise<JWTPayloadUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      id: String(payload.id),
      numeroEmpleado: String(payload.numeroEmpleado),
      nombreCompleto: String(payload.nombreCompleto),
      areaId: Number(payload.areaId),
      areaNombre: String(payload.areaNombre),
      rolCodigo: payload.rolCodigo as RoleCode,
    };
  } catch {
    return null;
  }
}
