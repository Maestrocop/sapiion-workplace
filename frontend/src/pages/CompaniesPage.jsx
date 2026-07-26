import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';

const STATUS_COLORS = {
  prospect: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-amber-100 text-amber-700',
  blacklisted: 'bg-red-100 text-red-700',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', sector: '', email: '' });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      setCompanies(await api.get(`/api/companies${query}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/companies', form);
      setForm({ name: '', city: '', sector: '', email: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Companies</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ Add company'}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64"
        />
        <button onClick={load} className="text-sm text-slate-500 border border-slate-300 rounded-lg px-3 py-2">Search</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-2 bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg py-2">Create</button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Sector</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last contact</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && companies.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No companies yet.</td></tr>}
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">{c.name}</td>
                <td className="px-4 py-2 text-slate-500">{c.city || '—'}</td>
                <td className="px-4 py-2 text-slate-500">{c.sector || '—'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.partnership_status] || ''}`}>{c.partnership_status}</span>
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDate(c.last_contact_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
