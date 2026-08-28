import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function EditClassModal({ klass, onClose, onSaved }) {
  const [name, setName] = useState(klass.name);
  const [code, setCode] = useState(klass.code || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setError('');
    setSaved(false);
    try {
      await api.put(`/api/classes/${klass.id}`, { name, code: code || undefined });
      setSaved(true);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">Edit Class</h2>
        <p className="text-sm text-slate-500 mb-4">Update the class name or code</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {saved && <p className="text-sm text-emerald-600">✓ Saved</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button onClick={save} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Save Class</button>
        </div>
      </div>
    </div>
  );
}

function CreateClassModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    setError('');
    try {
      const klass = await api.post('/api/classes', { name, code: code || undefined });
      onCreated(klass);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">New Class</h2>
        <p className="text-sm text-slate-500 mb-4">Classes/cohorts that internship programmes attach to</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input placeholder="e.g. BIM Year 3" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Code (optional)</label>
            <input placeholder="e.g. BIM3" value={code} onChange={(e) => setCode(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
          <button onClick={handleCreate} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Create</button>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  async function load() {
    setLoading(true);
    try { setClasses(await api.get('/api/classes')); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-slate-800">Classes</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          + New class
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">Classes/cohorts that internship programmes attach to</p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && classes.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No classes yet.</td></tr>}
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td
                  onClick={() => setEditingClass(c)}
                  className="px-4 py-2 font-medium text-slate-700 cursor-pointer hover:text-workplace-teal-700 hover:underline"
                >
                  {c.name}
                </td>
                <td className="px-4 py-2 text-slate-500">{c.code || '—'}</td>
                <td className="px-4 py-2 text-slate-400">{c.id}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setEditingClass(c)} className="text-xs text-workplace-teal-700 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingClass && (
        <EditClassModal
          klass={editingClass}
          onClose={() => setEditingClass(null)}
          onSaved={() => load()}
        />
      )}

      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}
