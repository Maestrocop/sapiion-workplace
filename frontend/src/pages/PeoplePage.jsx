import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ROLE_OPTIONS = ['student', 'teacher', 'coordinator', 'admin'];

export default function PeoplePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'student' });
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  async function load() {
    setLoading(true);
    try { setUsers(await api.get('/api/users')); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreated('');
    try {
      const user = await api.post('/api/users', {
        email: form.email, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        roles: [form.role],
      });
      setCreated(`✓ Created ${user.email} (id ${user.id}) — share the password with them directly`);
      setForm({ email: '', password: '', first_name: '', last_name: '', role: 'student' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-slate-800">People</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ New person'}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">Students, teachers, and coordinators — no self-registration, accounts are created here</p>

      {created && <p className="text-sm text-emerald-600 mb-4">{created}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input required type="password" placeholder="Temporary password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-2 bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg py-2">Create account</button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No people yet.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{(u.roles || []).join(', ')}</td>
                <td className="px-4 py-2 text-slate-400">{u.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
