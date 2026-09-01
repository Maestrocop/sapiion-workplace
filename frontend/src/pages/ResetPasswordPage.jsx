import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError(t('resetPassword.mismatch')); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <Logo className="mb-1" />
        <p className="text-slate-500 text-sm mb-6">{t('resetPassword.subtitle')}</p>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{t('resetPassword.missingToken')}</p>
            <Link to="/forgot-password" className="block text-center text-sm text-workplace-teal-700 hover:underline">
              {t('resetPassword.requestNewLink')}
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-600">{t('resetPassword.success')}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white rounded-lg py-2 font-medium"
            >
              {t('resetPassword.goToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('resetPassword.newPassword')}</label>
              <input
                type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-workplace-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('resetPassword.confirmPassword')}</label>
              <input
                type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-workplace-teal-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {loading ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
