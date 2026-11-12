import { randomUUID } from 'crypto';
import { sign, SignOptions } from 'jsonwebtoken';

/**
 * Generate a JWT access token for tests.
 * In the test environment the engine verifies tokens with the symmetric JWT_SECRET (HS256).
 */
export function generateAccessToken(
  userId?: string,
  options: SignOptions = {},
  payload: string | Buffer | object = {}
): string {
  const id = userId ?? randomUUID();
  if (!process.env.JWT_SECRET) throw new Error('Missing JWT signing secret');
  return sign(
    typeof payload === 'object' && !Buffer.isBuffer(payload)
      ? { ...payload, user: { id } }
      : payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
      audience: process.env.ACCESS_TOKEN_AUDIENCE,
      issuer: process.env.ACCESS_TOKEN_ISSUER,
      subject: id,
      jwtid: randomUUID(),
      ...options
    }
  );
}

/** Generate a Bearer authorization header value */
export function getBearer(
  userId?: string,
  options: SignOptions = {},
  payload: string | Buffer | object = {}
): string {
  return `Bearer ${generateAccessToken(userId, options, payload)}`;
}

/** Build a minimal user object for tests */
export function buildUser<T extends object>(
  attributes: T = {} as T
): { id: string } & T {
  return { id: randomUUID(), ...attributes };
}
