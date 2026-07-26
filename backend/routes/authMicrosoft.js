import express from 'express';
import crypto from 'crypto';
import { signToken, generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_DAYS } from '../lib/auth.js';

const router = express.Router();

function configured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

// GET /api/auth/microsoft — redirect to Microsoft's consent screen
router.get('/', (req, res) => {
  if (!configured()) {
    return res.status(501).json({ error: 'Microsoft sign-in is not configured on this server. An administrator must set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.' });
  }
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    state,
  });
  res.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`);
});

// GET /api/auth/microsoft/callback
router.get('/callback', async (req, res) => {
  if (!configured()) return res.status(501).json({ error: 'Microsoft sign-in is not configured on this server.' });
  const { code, error, error_description } = req.query;
  if (error) return res.status(400).json({ error: error_description || error });
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });

  try {
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.MICROSOFT_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(400).json({ error: tokenData.error_description || 'Token exchange failed' });

    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) return res.status(400).json({ error: 'Failed to fetch Microsoft profile' });

    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Microsoft account has no usable email' });

    const { User } = req.models;
    let user = await User.findOne({ where: { microsoft_id: profile.id } });
    if (!user) user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        microsoft_id: profile.id,
        first_name: profile.givenName || profile.displayName || 'Unknown',
        last_name:  profile.surname || '',
        roles: ['student'],
      });
    } else if (!user.microsoft_id) {
      await user.update({ microsoft_id: profile.id });
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
    console.error('[auth/microsoft/callback]', err);
    res.status(500).json({ error: 'Microsoft sign-in failed' });
  }
});

export default router;
