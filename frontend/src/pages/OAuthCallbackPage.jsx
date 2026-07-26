import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

// Landed here after a Microsoft/Google redirect with ?token=&refresh_token=
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const refresh_token = params.get('refresh_token');
    if (!token) { navigate('/login'); return; }

    localStorage.setItem('token', token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

    api.get('/api/auth/me').then((data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/companies';
    }).catch(() => navigate('/login'));
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Signing you in…
    </div>
  );
}
