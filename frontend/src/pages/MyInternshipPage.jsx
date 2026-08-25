import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PhaseProgress from '../components/PhaseProgress';

export default function MyInternshipPage() {
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logForm, setLogForm] = useState({ title: '', week_starting: '', hours_logged: '', content: '' });

  async function load() {
    setLoading(true);
    try {
      const list = await api.get('/api/internships/mine');
      setInternship(list[0] || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addLog(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internships/${internship.id}/activity-logs`, {
        ...logForm, hours_logged: logForm.hours_logged ? Number(logForm.hours_logged) : undefined,
      });
      setLogForm({ title: '', week_starting: '', hours_logged: '', content: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  if (!internship) {
    return <p className="text-slate-400 text-sm">No internship placement yet — check with your coordinator.</p>;
  }

  const completedAssessments = (internship.assessments || []).filter((a) => a.is_completed);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-1">My Internship</h1>
      <p className="text-sm text-slate-500 mb-4">{internship.company_name || 'Company not yet assigned'}</p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <PhaseProgress phase={internship.phase} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-600 mb-2">Placement details</h2>
          <p className="text-sm text-slate-700">{internship.company_name || 'Not yet assigned'}</p>
          {internship.start_date && (
            <p className="text-sm text-slate-500">{formatDate(internship.start_date)} → {formatDate(internship.end_date)}</p>
          )}
          <p className="text-xs text-slate-400 mt-2 capitalize">Status: {internship.status}</p>
        </div>

        {completedAssessments.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-600 mb-2">Assessment</h2>
            {completedAssessments.map((a) => (
              <div key={a.id} className="text-sm mb-2">
                <p className="font-medium capitalize">{a.assessor_role}: {a.score}/{a.max_score}</p>
                {a.feedback && <p className="text-slate-600">{a.feedback}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-medium text-slate-600 mb-3">Daily Activity Logs</h2>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <form onSubmit={addLog} className="space-y-2 mb-4">
          <input
            placeholder="Title" value={logForm.title} onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date" value={logForm.week_starting} onChange={(e) => setLogForm({ ...logForm, week_starting: e.target.value })}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number" placeholder="Hours worked" value={logForm.hours_logged}
              onChange={(e) => setLogForm({ ...logForm, hours_logged: e.target.value })}
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            required placeholder="What did you do and learn today?" value={logForm.content}
            onChange={(e) => setLogForm({ ...logForm, content: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2}
          />
          <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">
            + Add log
          </button>
        </form>

        {(internship.activityLogs || []).length === 0 && <p className="text-sm text-slate-400">No logs submitted yet.</p>}
        <div className="space-y-2">
          {(internship.activityLogs || []).map((log) => (
            <div key={log.id} className="border border-slate-100 rounded-lg p-3 text-sm">
              <p className="font-medium">{log.title || formatDate(log.week_starting)} — {log.hours_logged || 0}h {log.supervisor_ack && <span className="text-emerald-600 text-xs">✓ acknowledged</span>}</p>
              <p className="text-slate-600">{log.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
