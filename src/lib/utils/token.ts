import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Asegúrate de tener una variable de entorno para el secreto o usa una por defecto
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'fisioterapia-token-secret';

/**
 * Genera un token de restablecimiento de contraseña
 * @param payload Los datos a incluir en el token (generalmente userId)
 * @param expiresIn Tiempo de expiración (por defecto 10 horas)
 * @returns El token generado
 */
export function generateResetToken(payload: object, expiresIn: string = '10h'): string {
  // @ts-ignore - Ignoring TypeScript error due to jwt library type definition issues
  return jwt.sign(payload, TOKEN_SECRET, { expiresIn });
}

/**
 * Verifica un token y devuelve la información contenida
 * @param token El token a verificar
 * @returns Los datos del token o null si es inválido
 */
export function verifyToken(token: string): any {
  try {
    // @ts-ignore - Ignoring TypeScript error due to jwt library type definition issues
    return jwt.verify(token, TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Genera un string aleatorio para usarse como ID único
 * @param length Longitud del string (por defecto 16)
 * @returns String aleatorio en hexadecimal
 */
export function generateRandomId(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
