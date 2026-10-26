import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { findUserByEmail } from './userService';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

function getJwtConfig(): { secret: Secret; expiresIn: SignOptions['expiresIn'] } {
  // As variáveis são validadas no boot (src/config/env.ts); isto só protege usos fora do index.ts.
  if (!JWT_SECRET || !JWT_EXPIRES_IN) {
    throw new Error('JWT_SECRET e JWT_EXPIRES_IN precisam estar definidos');
  }
  // Repassa o valor como string, igual antes (ex.: "7d", "12h"; sem unidade o jsonwebtoken usa milissegundos).
  return { secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
}

export async function signLoginToken(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const ok = await verifyPassword(password, user.password);
  if (!ok) return null;

  const { secret, expiresIn } = getJwtConfig();
  const payload = { sub: user.id, email: user.email, phone: user.phone };
  return jwt.sign(payload, secret, { expiresIn });
}
