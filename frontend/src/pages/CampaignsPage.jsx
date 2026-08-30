import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

const STATUS_STYLE = {
  planning:  'bg-slate-100 text-slate-500',
  active:    'bg-emerald-100 text-emerald-700',
  closed:    'bg-slate-200 text-slate-500',
  cancelled: 'bg-red-100 text-red-500',
};

// Same phase colors as PhaseProgress, for the segmented distribution bar.
const PHASE_BAR = [
  { key: 'searching',  color: 'bg-slate-300' },
  { key: 'placed',     color: 'bg-blue-400' },
  { key: 'on_site',    color: 'bg-workplace-teal-500' },
  { key: 'evaluating', color: 'bg-emerald-500' },
  { key: 'completed',  color: 'bg-slate-200' },
];

function ProgrammeStats({ stats }) {
  const { t } = useTranslation();
  if (!stats || stats.total === 0) {
    return <p className="text-xs text-slate-400">{t('campaigns.stats.noStudents')}</p>;
  }
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-2">
        {PHASE_BAR.map((p) => {
          const pct = (stats[p.key] / stats.total) * 100;
          return pct > 0 ? <div key={p.key} className={p.color} style={{ width: `${pct}%` }} title={`${stats[p.key]} ${t(`phase.${p.key}`)}`} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{t('campaigns.stats.students', { count: stats.total })}</span>
        {PHASE_BAR.filter((p) => p.key !== 'completed').map((p) => (
          stats[p.key] > 0 && <span key={p.key}>{stats[p.key]} {t(`phase.${p.key}`)}</span>
        ))}
        {stats.inactive > 0 && <span className="text-amber-600">{t('campaigns.stats.inactive', { count: stats.inactive })}</span>}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const [campaigns, setCampaigns] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const filtered = campaigns.filter((c) => {
    if (yearFilter && String(c.academicYear?.id) !== yearFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const byYear = new Map();
    for (const c of filtered) {
      const label = c.academicYear?.label || t('campaigns.noYearGroup');
      if (!byYear.has(label)) byYear.set(label, []);
      byYear.get(label).push(c);
    }
    // Most recent year first
    return [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, t]);

  return (
    <div>
      <PageHeader
        title={t('campaigns.title')}
        subtitle={t('campaigns.subtitle')}
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
          >
            {showForm ? t('common.cancel') : t('campaigns.newProgramme')}
          </button>
        }
      >
        <div className="flex items-center gap-3 flex-wrap">
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-1.5">
            <option value="">{t('campaigns.allYears')}</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-1.5">
            <option value="">{t('campaigns.allStatus')}</option>
            {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{t(`campaigns.status.${s}`)}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-400">{t('campaigns.programmeCount', { count: filtered.length })}</span>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-workplace-teal-700 hover:underline mt-2 block">
            {showAll ? t('campaigns.showMine') : t('campaigns.showAll')}
          </button>
        )}
        {isAdmin && <p className="text-xs text-slate-400 mt-2">{t('campaigns.adminViewNote')}</p>}
      </PageHeader>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">{t('campaigns.createForm.classPlaceholder')}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
          </select>
          <select required value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">{t('campaigns.createForm.yearPlaceholder')}</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? ' (current)' : ''}</option>)}
          </select>
          <input required placeholder={t('campaigns.createForm.namePlaceholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {classes.length === 0 && (
            <p className="col-span-3 text-sm text-amber-600">{t('campaigns.createForm.noClasses')} <Link to="/classes" className="underline">{t('campaigns.createForm.createOneFirst')}</Link>.</p>
          )}
          {error && <p className="col-span-3 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-3 bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg py-2">{t('common.create')}</button>
        </form>
      )}

      {loading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-400 text-sm">{t('campaigns.noProgrammes')}</p>}

      {!loading && grouped.map(([yearLabel, group]) => (
        <div key={yearLabel} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{yearLabel}</h2>
          <div className="grid gap-3">
            {group.map((c) => (
              <Link
                key={c.id} to={`/campaigns/${c.id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-workplace-teal-400"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-sm text-slate-500">
                      {c.class?.name}
                      {(showAll || isAdmin) && c.coordinator && ` · ${c.coordinator.first_name} ${c.coordinator.last_name}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>{t(`campaigns.status.${c.status}`)}</span>
                </div>
                <ProgrammeStats stats={c.stats} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
