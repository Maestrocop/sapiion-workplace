import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ROLE_OPTIONS = ['student', 'teacher', 'coordinator', 'admin'];

function EditUserModal({ user, classes, onClose, onSaved }) {
  const [roles, setRoles] = useState(user.roles || []);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [classId, setClassId] = useState(user.class_id || '');
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function toggleRole(role) {
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));
  }

  async function saveProfile() {
    setError('');
    setSaved(false);
    if (roles.length === 0) { setError('At least one role is required'); return; }
    try {
      await api.put(`/api/users/${user.id}`, {
        first_name: firstName, last_name: lastName, roles, is_active: isActive,
        class_id: classId ? Number(classId) : null,
      });
      setSaved(true);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setPassword() {
    setPasswordError('');
    setPasswordMessage('');
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return; }
    try {
      await api.put(`/api/users/${user.id}`, { password: newPassword });
      setPasswordMessage('✓ Password updated');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Edit User</h2>
        <p className="text-sm text-slate-500 mb-4">Update profile and roles</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{user.email}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cohort (optional)</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">No cohort</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Roles</label>
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

          {saved && <p className="text-sm text-emerald-600">✓ Saved</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-slate-200 mt-4 pt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Set new password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-9"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                👁
              </button>
            </div>
            <button onClick={setPassword} className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">
              Set password
            </button>
          </div>
          {passwordMessage && <p className="text-sm text-emerald-600 mt-1">{passwordMessage}</p>}
          {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button onClick={saveProfile} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Save User</button>
        </div>
      </div>
    </div>
  );
}

const emptyCreateForm = { email: '', password: '', first_name: '', last_name: '', roles: ['student'], class_id: '' };

export default function PeoplePage() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyCreateForm);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  function toggleCreateRole(role) {
    setForm((f) => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter((x) => x !== role) : [...f.roles, role] }));
  }

  async function load() {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([api.get('/api/users'), api.get('/api/classes')]);
      setUsers(u);
      setClasses(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreated('');
    if (form.roles.length === 0) { setError('At least one role is required'); return; }
    try {
      const user = await api.post('/api/users', {
        email: form.email, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        roles: form.roles,
        class_id: form.class_id ? Number(form.class_id) : null,
      });
      setCreated(`✓ Created ${user.email} (id ${user.id}) — share the password with them directly`);
      setForm(emptyCreateForm);
      setShowPassword(false);
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
          <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">No cohort</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
          </select>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Roles</label>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleCreateRole(r)} /> {r}
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-2 relative">
            <input
              required type={showPassword ? 'text' : 'password'} placeholder="Temporary password (min 8 chars)"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-9"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              👁
            </button>
          </div>

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
              <th className="px-4 py-2">Cohort</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No users yet.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">
                  {u.first_name} {u.last_name} {u.is_active === false && <span className="text-xs text-slate-400">(inactive)</span>}
                </td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{u.cohortClass?.name || '—'}</td>
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
          classes={classes}
          onClose={() => setEditingUser(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
