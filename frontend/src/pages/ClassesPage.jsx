import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';

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

function CreateAcademicYearModal({ onClose, onCreated }) {
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [isCurrent, setIsCurrent] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setError('');
    const year = Number(startYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) { setError('Enter a valid start year'); return; }
    try {
      const academicYear = await api.post('/api/internship-campaigns/academic-years', {
        start_year: year, is_current: isCurrent,
      });
      onCreated(academicYear);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">New Academic Year</h2>
        <p className="text-sm text-slate-500 mb-4">Runs 1 Sept → 31 Aug, e.g. 2027 creates "2027-2028"</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Start year</label>
            <input
              type="number" placeholder="e.g. 2027" value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
            Set as the current academic year
          </label>
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
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateYearModal, setShowCreateYearModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [c, y] = await Promise.all([api.get('/api/classes'), api.get('/api/internship-campaigns/academic-years')]);
      setClasses(c);
      setYears(y);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Classes that internship programmes attach to"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
          >
            + New class
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
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

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Academic Years</h2>
        <button
          onClick={() => setShowCreateYearModal(true)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          + New academic year
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">A student's cohort (e.g. "2026-2027") and the scope internship programmes run within</p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Starts</th>
              <th className="px-4 py-2">Ends</th>
              <th className="px-4 py-2">Current</th>
            </tr>
          </thead>
          <tbody>
            {!loading && years.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No academic years yet.</td></tr>}
            {years.map((y) => (
              <tr key={y.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">{y.label}</td>
                <td className="px-4 py-2 text-slate-500">{y.start_date}</td>
                <td className="px-4 py-2 text-slate-500">{y.end_date}</td>
                <td className="px-4 py-2">
                  {y.is_current && <span className="text-xs bg-workplace-teal-50 text-workplace-teal-700 px-2 py-0.5 rounded-full">Current</span>}
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

      {showCreateYearModal && (
        <CreateAcademicYearModal
          onClose={() => setShowCreateYearModal(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}
