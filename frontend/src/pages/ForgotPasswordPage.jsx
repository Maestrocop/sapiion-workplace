import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Backend always returns { ok: true } regardless of whether the email
      // exists, so there's nothing to branch on here — just show the same
      // message either way.
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
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
        <p className="text-slate-500 text-sm mb-6">{t('forgotPassword.subtitle')}</p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t('forgotPassword.checkEmail')}</p>
            <p className="text-xs text-slate-400">{t('forgotPassword.smtpNote')}</p>
            <Link to="/login" className="block text-center text-sm text-workplace-teal-700 hover:underline">
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('forgotPassword.email')}</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-workplace-teal-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
            </button>

            <Link to="/login" className="block text-center text-sm text-slate-500 hover:text-workplace-teal-700">
              {t('forgotPassword.backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
