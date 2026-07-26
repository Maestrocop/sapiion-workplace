import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/companies');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-xl font-semibold text-workplace-teal-700 mb-1">Sapiion Workplace</h1>
        <p className="text-slate-500 text-sm mb-6">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-workplace-teal-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-workplace-teal-600"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2">
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:4100'}/api/auth/microsoft`}
             className="w-full text-center border border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">
            Sign in with Microsoft
          </a>
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:4100'}/api/auth/google`}
             className="w-full text-center border border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  );
}
