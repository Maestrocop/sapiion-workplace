import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';

const ROLE_OPTIONS = ['student', 'teacher', 'coordinator', 'admin'];

function EditUserModal({ user, classes, years, onClose, onSaved }) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState(user.roles || []);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [classId, setClassId] = useState(user.class_id || '');
  const [academicYearId, setAcademicYearId] = useState(user.academic_year_id || '');
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
    if (roles.length === 0) { setError(t('users.atLeastOneRole')); return; }
    try {
      await api.put(`/api/users/${user.id}`, {
        first_name: firstName, last_name: lastName, roles, is_active: isActive,
        class_id: classId ? Number(classId) : null,
        academic_year_id: academicYearId ? Number(academicYearId) : null,
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
    if (newPassword.length < 8) { setPasswordError(t('users.passwordMinLength')); return; }
    try {
      await api.put(`/api/users/${user.id}`, { password: newPassword });
      setPasswordMessage(t('users.passwordUpdated'));
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">{t('users.editModal.title')}</h2>
        <p className="text-sm text-slate-500 mb-4">{t('users.editModal.subtitle')}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.firstName')}</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.lastName')}</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.email')}</label>
            <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{user.email}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.class')}</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('users.editModal.noClass')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.cohort')}</label>
            <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('users.editModal.noCohort')}</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.roles')}</label>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} /> {t(`users.roles.${r}`)}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> {t('users.editModal.active')}
          </label>

          {saved && <p className="text-sm text-emerald-600">{t('users.editModal.saved')}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-slate-200 mt-4 pt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.editModal.setPassword')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('users.editModal.passwordPlaceholder')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-9"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                👁
              </button>
            </div>
            <button onClick={setPassword} className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">
              {t('users.editModal.setPasswordButton')}
            </button>
          </div>
          {passwordMessage && <p className="text-sm text-emerald-600 mt-1">{passwordMessage}</p>}
          {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">{t('common.cancel')}</button>
          <button onClick={saveProfile} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">{t('users.editModal.save')}</button>
        </div>
      </div>
    </div>
  );
}

const emptyCreateForm = { email: '', password: '', first_name: '', last_name: '', roles: ['student'], class_id: '', academic_year_id: '' };

function CreateUserModal({ classes, years, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyCreateForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function toggleRole(role) {
    setForm((f) => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter((x) => x !== role) : [...f.roles, role] }));
  }

  async function handleCreate() {
    setError('');
    if (form.roles.length === 0) { setError(t('users.atLeastOneRole')); return; }
    try {
      const user = await api.post('/api/users', {
        email: form.email, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        roles: form.roles,
        class_id: form.class_id ? Number(form.class_id) : null,
        academic_year_id: form.academic_year_id ? Number(form.academic_year_id) : null,
      });
      onCreated(user);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">{t('users.createModal.title')}</h2>
        <p className="text-sm text-slate-500 mb-4">{t('users.createModal.subtitle')}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.firstName')}</label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.lastName')}</label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.email')}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.class')}</label>
            <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('users.createModal.noClass')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.cohort')}</label>
            <select value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('users.createModal.noCohort')}</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.roles')}</label>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} /> {t(`users.roles.${r}`)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('users.createModal.tempPassword')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} placeholder={t('users.createModal.passwordPlaceholder')}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-9"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                👁
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">{t('common.cancel')}</button>
          <button onClick={handleCreate} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">{t('users.createModal.createAccount')}</button>
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [created, setCreated] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [u, c, y] = await Promise.all([
        api.get('/api/users'), api.get('/api/classes'), api.get('/api/internship-campaigns/academic-years'),
      ]);
      setUsers(u);
      setClasses(c);
      setYears(y);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const activeCount = users.filter((u) => u.is_active !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle', { active: activeCount, inactive: inactiveCount })}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
          >
            {t('users.newUser')}
          </button>
        }
      />

      {created && <p className="text-sm text-emerald-600 mb-4">{created}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">{t('users.table.name')}</th>
              <th className="px-4 py-2">{t('users.table.email')}</th>
              <th className="px-4 py-2">{t('users.table.class')}</th>
              <th className="px-4 py-2">{t('users.table.cohort')}</th>
              <th className="px-4 py-2">{t('users.table.roles')}</th>
              <th className="px-4 py-2">{t('users.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">{t('common.loading')}</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">{t('users.noUsers')}</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td
                  onClick={() => setEditingUser(u)}
                  className="px-4 py-2 font-medium text-slate-700 cursor-pointer hover:text-workplace-teal-700 hover:underline"
                >
                  {u.first_name} {u.last_name} {u.is_active === false && <span className="text-xs text-slate-400">{t('users.inactiveTag')}</span>}
                </td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{u.enrolledClass?.name || '—'}</td>
                <td className="px-4 py-2 text-slate-500">{u.cohort?.label || '—'}</td>
                <td className="px-4 py-2 text-slate-500">{(u.roles || []).map((r) => t(`users.roles.${r}`, r)).join(', ')}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setEditingUser(u)} className="text-xs text-workplace-teal-700 hover:underline">{t('common.edit')}</button>
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
          years={years}
          onClose={() => setEditingUser(null)}
          onSaved={() => load()}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          classes={classes}
          years={years}
          onClose={() => setShowCreateModal(false)}
          onCreated={(user) => {
            setCreated(t('users.created', { email: user.email, id: user.id }));
            load();
          }}
        />
      )}
    </div>
  );
}
