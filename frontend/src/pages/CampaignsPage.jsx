import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

export default function CampaignsPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const [campaigns, setCampaigns] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ class_id: '', academic_year_id: '', name: '' });
  const [error, setError] = useState('');

  async function load(all) {
    setLoading(true);
    try {
      const [c, y, cl] = await Promise.all([
        api.get(`/api/internship-campaigns${all ? '?all=1' : ''}`),
        api.get('/api/internship-campaigns/academic-years'),
        api.get('/api/classes'),
      ]);
      setCampaigns(c);
      setYears(y);
      setClasses(cl);
      const current = y.find((yr) => yr.is_current);
      if (current) setForm((f) => ({ ...f, academic_year_id: current.id }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(showAll); }, [showAll]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/internship-campaigns', {
        class_id: Number(form.class_id),
        academic_year_id: Number(form.academic_year_id),
        name: form.name,
      });
      setForm({ class_id: '', academic_year_id: form.academic_year_id, name: '' });
      setShowForm(false);
      load(showAll);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Internship Programme"
        subtitle="One programme per class — tracks all students from job search to final evaluation"
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
          >
            {showForm ? 'Cancel' : '+ New programme'}
          </button>
        }
      >
        {!isAdmin && (
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-workplace-teal-700 hover:underline">
            {showAll ? '← Show only my programmes' : 'Show all coordinators\' programmes →'}
          </button>
        )}
        {isAdmin && <p className="text-xs text-slate-400">Showing every coordinator's programmes (admin view)</p>}
      </PageHeader>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
          </select>
          <select required value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Academic year…</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
          </select>
          <input required placeholder="Programme name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {classes.length === 0 && (
            <p className="col-span-3 text-sm text-amber-600">No classes exist yet — <Link to="/classes" className="underline">create one first</Link>.</p>
          )}
          {error && <p className="col-span-3 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-3 bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg py-2">Create</button>
        </form>
      )}

      {!loading && (
        <p className="text-sm text-slate-500 mb-2">{campaigns.length} programme{campaigns.length === 1 ? '' : 's'}</p>
      )}
      <div className="grid gap-3">
        {loading && <p className="text-slate-400 text-sm">Loading…</p>}
        {!loading && campaigns.length === 0 && <p className="text-slate-400 text-sm">No programmes yet.</p>}
        {campaigns.map((c) => (
          <Link
            key={c.id} to={`/campaigns/${c.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-workplace-teal-400"
          >
            <div>
              <p className="font-medium text-slate-800">{c.name}</p>
              <p className="text-sm text-slate-500">
                {c.class?.name} · {c.academicYear?.label}
                {(showAll || isAdmin) && c.coordinator && ` · ${c.coordinator.first_name} ${c.coordinator.last_name}`}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
