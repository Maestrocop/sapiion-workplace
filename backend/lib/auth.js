import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import { z } from 'zod';

// Single source of truth for "what counts as an acceptable password" —
// used everywhere a password is set (self-service reset/change in
// routes/auth.js, and admin-created/admin-set accounts in routes/users.js).
// Previously routes/users.js only required 8 characters with no complexity
// while routes/auth.js already required this stronger rule — the weaker one
// mattered more since it's how every account starts out. (#5)
export const strongPasswordRule = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set — add it to backend/.env before starting the server');
  return s;
}

function expires() {
  return process.env.JWT_EXPIRES_IN || '2h';
}

export function signToken(user) {
  return jwt.sign(
    {
      id:         Number(user.id),
      email:      user.email,
      roles:      user.roles || [],
      first_name: user.first_name,
      last_name:  user.last_name,
    },
    secret(),
    { expiresIn: expires() },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export async function hashPassword(plain) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(plain, hash) {
  return argon2.verify(hash, plain);
}

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const REFRESH_TOKEN_TTL_DAYS = 30;
