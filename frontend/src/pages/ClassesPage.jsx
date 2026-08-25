import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setClasses(await api.get('/api/classes')); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/classes', form);
      setForm({ name: '', code: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-slate-800">Classes</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ New class'}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">Classes/cohorts that internship programmes attach to</p>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="Class name (e.g. BIM Year 3)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Code (e.g. BIM3)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-2 bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg py-2">Create</button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && classes.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No classes yet.</td></tr>}
            {classes.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">{c.name}</td>
                <td className="px-4 py-2 text-slate-500">{c.code || '—'}</td>
                <td className="px-4 py-2 text-slate-400">{c.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
