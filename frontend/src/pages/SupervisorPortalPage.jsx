import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../lib/api';
import { formatDate } from '../lib/dates';

// Public page — no login. Access is controlled entirely by the token in the URL.
async function portalRequest(token, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}/api/supervisor-portal/${token}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function SupervisorPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', job_title: '', start_date: '', end_date: '', working_schedule: '' });
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const result = await portalRequest(token);
      setData(result);
      setForm({
        name: result.supervisor.name || '', email: result.supervisor.email || '',
        phone: result.supervisor.phone || '', job_title: result.supervisor.job_title || '',
        start_date: result.internship.start_date || '', end_date: result.internship.end_date || '',
        working_schedule: result.internship.working_schedule || '',
      });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await portalRequest(token, { method: 'PUT', body: form });
      setSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function acknowledgeLog(logId, comment) {
    try {
      await fetch(`${API_URL}/api/supervisor-portal/${token}/logs/${logId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisor_comment: comment }),
      });
      load();
    } catch { /* best-effort */ }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-200 rounded-xl p-6 text-red-600 max-w-md text-center">{error}</div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-xl font-semibold text-workplace-teal-700 mb-1">Sapiion Workplace — Supervisor</h1>
        <p className="text-slate-500 text-sm mb-6">
          You're supervising {data.internship.student_name || 'a student'} at {data.internship.company_name || 'your company'}.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-slate-600 mb-3">Your details</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Job title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input placeholder="Working schedule (e.g. Mon-Fri 09:00-17:00)" value={form.working_schedule} onChange={(e) => setForm({ ...form, working_schedule: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {saved && <p className="text-sm text-emerald-600">✓ Saved</p>}
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Save</button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-600 mb-3">Weekly activity logs</h2>
          {data.logs.length === 0 && <p className="text-sm text-slate-400">No logs submitted yet.</p>}
          <div className="space-y-2">
            {data.logs.map((log) => (
              <div key={log.id} className="border border-slate-100 rounded-lg p-3">
                <p className="text-sm font-medium">{formatDate(log.week_starting)} — {log.hours_logged || 0}h</p>
                <p className="text-sm text-slate-600 mb-2">{log.content}</p>
                {log.supervisor_ack ? (
                  <p className="text-xs text-emerald-600">✓ You acknowledged this log{log.supervisor_comment ? `: "${log.supervisor_comment}"` : ''}</p>
                ) : (
                  <AckForm onAck={(comment) => acknowledgeLog(log.id, comment)} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AckForm({ onAck }) {
  const [comment, setComment] = useState('');
  return (
    <div className="flex gap-2">
      <input
        placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)}
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-xs"
      />
      <button onClick={() => onAck(comment)} className="text-xs bg-workplace-teal-600 text-white rounded-lg px-3 py-1">Acknowledge</button>
    </div>
  );
}
