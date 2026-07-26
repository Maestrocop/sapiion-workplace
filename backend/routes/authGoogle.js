import express from 'express';
import crypto from 'crypto';
import { signToken, generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_DAYS } from '../lib/auth.js';

const router = express.Router();

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// GET /api/auth/google — redirect to Google's consent screen
router.get('/', (req, res) => {
  if (!configured()) {
    return res.status(501).json({ error: 'Google sign-in is not configured on this server. An administrator must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    scope: 'openid profile email',
    state,
    access_type: 'online',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback
router.get('/callback', async (req, res) => {
  if (!configured()) return res.status(501).json({ error: 'Google sign-in is not configured on this server.' });
  const { code, error } = req.query;
  if (error) return res.status(400).json({ error });
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(400).json({ error: tokenData.error_description || 'Token exchange failed' });

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) return res.status(400).json({ error: 'Failed to fetch Google profile' });

    const email = (profile.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Google account has no usable email' });

    const { User } = req.models;
    let user = await User.findOne({ where: { google_id: profile.id } });
    if (!user) user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        google_id: profile.id,
        first_name: profile.given_name || profile.name || 'Unknown',
        last_name:  profile.family_name || '',
        avatar_url: profile.picture || null,
        roles: ['student'],
      });
    } else if (!user.google_id) {
      await user.update({ google_id: profile.id });
    }

    await user.update({ last_login_at: new Date() });

    const token = signToken(user.toJSON());
    const refreshToken = generateRefreshToken();
    const refreshHash  = hashRefreshToken(refreshToken);
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await req.models.sequelize.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :hash, :expires)`,
      { replacements: { userId: user.id, hash: refreshHash, expires: refreshExpires } }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/oauth-callback?token=${token}&refresh_token=${refreshToken}`);
  } catch (err) {
    console.error('[auth/google/callback]', err);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

export default router;
