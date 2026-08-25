import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ROLE_OPTIONS = ['student', 'teacher', 'coordinator', 'admin'];

function EditUserModal({ user, onClose, onSaved }) {
  const [roles, setRoles] = useState(user.roles || []);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [error, setError] = useState('');

  function toggleRole(role) {
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));
  }

  async function save() {
    setError('');
    if (roles.length === 0) { setError('At least one role is required'); return; }
    try {
      await api.put(`/api/users/${user.id}`, { first_name: firstName, last_name: lastName, roles, is_active: isActive });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Edit user</h2>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <p className="text-sm text-slate-400">{user.email}</p>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Roles</p>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} /> {r}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button onClick={save} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
        <h1 className="text-lg font-semibold text-slate-800">Users</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ New User'}
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
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No users yet.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">
                  {u.first_name} {u.last_name} {u.is_active === false && <span className="text-xs text-slate-400">(inactive)</span>}
                </td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{(u.roles || []).join(', ')}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setEditingUser(u)} className="text-xs text-workplace-teal-700 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); load(); }}
        />
      )}
    </div>
  );
}
