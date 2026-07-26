import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { signToken, verifyPassword, hashPassword, generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_DAYS } from '../lib/auth.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { sendPasswordResetEmail } from '../lib/mailer.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests — please try again in 15 minutes' },
});

const passwordRule = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long');
const strongPasswordRule = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const loginSchema = z.object({
  email:    z.string().email('Invalid email format').max(254),
  password: passwordRule,
});

const forgotPasswordSchema = z.object({ email: z.string().email('Invalid email format').max(254) });

const resetPasswordSchema = z.object({
  token:        z.string().min(1, 'Token is required').max(128),
  new_password: strongPasswordRule,
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required').max(128),
  new_password:     strongPasswordRule,
});

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100).trim(),
  last_name:  z.string().min(1, 'Last name is required').max(100).trim(),
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const { User } = req.models;
    const user = await User.findOne({ where: { email: email.toLowerCase().trim(), is_active: true } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Account locked — too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account signs in with Microsoft or Google — use that instead' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockout  = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await user.update({ failed_login_attempts: attempts, locked_until: lockout });
      if (lockout) return res.status(429).json({ error: 'Account locked for 30 minutes after 5 failed attempts.' });
      return res.status(401).json({ error: `Invalid credentials. ${5 - attempts} attempt${5 - attempts !== 1 ? 's' : ''} remaining before lockout.` });
    }

    await user.update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date() });

    const token = signToken(user.toJSON());
    const refreshToken = generateRefreshToken();
    const refreshHash  = hashRefreshToken(refreshToken);
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await req.models.sequelize.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :hash, :expires)`,
      { replacements: { userId: user.id, hash: refreshHash, expires: refreshExpires } }
    );

    res.json({
      token,
      refresh_token: refreshToken,
      user: {
        id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name,
        roles: user.roles || [], avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me/profile
router.put('/me/profile', requireAuth, validate(profileSchema), async (req, res) => {
  try {
    const { first_name, last_name } = req.body;
    const { User } = req.models;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ first_name: first_name.trim(), last_name: last_name.trim() });
    res.json({ ok: true, first_name: user.first_name, last_name: user.last_name });
  } catch (err) {
    console.error('[auth/me/profile]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/me/password
router.put('/me/password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const { User } = req.models;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (!user.password_hash) return res.status(400).json({ error: 'This account has no password to change — it signs in via OAuth' });

    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHash = await hashPassword(new_password);
    await user.update({ password_hash: newHash, failed_login_attempts: 0, locked_until: null });
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/me/password]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const { User } = req.models;
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    // Always return 200 — never reveal whether the email exists
    if (!user || !user.is_active || !user.password_hash) return res.json({ ok: true });

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.update({ password_reset_token: token, password_reset_expires: expires });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail({ to: user.email, resetUrl });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, new_password } = req.body;
    const { User } = req.models;
    const user = await User.findOne({ where: { password_reset_token: token } });

    if (!user || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hash = await hashPassword(new_password);
    await user.update({
      password_hash: hash, password_reset_token: null, password_reset_expires: null,
      failed_login_attempts: 0, locked_until: null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(401).json({ error: 'Refresh token required' });

    const tokenHash = hashRefreshToken(refresh_token);
    const seq = req.models.sequelize;

    const [[row]] = await seq.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.is_active
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = :hash`,
      { replacements: { hash: tokenHash } }
    );

    if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
    if (row.revoked_at) return res.status(401).json({ error: 'Refresh token has been revoked' });
    if (new Date(row.expires_at) < new Date()) return res.status(401).json({ error: 'Refresh token has expired' });
    if (!row.is_active) return res.status(401).json({ error: 'Account is inactive' });

    await seq.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`, { replacements: { id: row.id } });

    const { User } = req.models;
    const user = await User.findByPk(row.user_id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newToken = signToken(user.toJSON());
    const newRefreshToken = generateRefreshToken();
    const newRefreshHash  = hashRefreshToken(newRefreshToken);
    const newExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await seq.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :hash, :expires)`,
      { replacements: { userId: user.id, hash: newRefreshHash, expires: newExpires } }
    );

    res.json({ token: newToken, refresh_token: newRefreshToken });
  } catch (err) {
    console.error('[auth/refresh]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const tokenHash = hashRefreshToken(refresh_token);
      await req.models.sequelize.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :hash AND revoked_at IS NULL`,
        { replacements: { hash: tokenHash } }
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/logout]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
