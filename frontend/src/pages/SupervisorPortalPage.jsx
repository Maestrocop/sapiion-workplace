import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../lib/api';
import { formatDate } from '../lib/dates';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

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
  const { t } = useTranslation();
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

  async function respondToReview(reviewId, response) {
    try {
      await fetch(`${API_URL}/api/supervisor-portal/${token}/reviews/${reviewId}/respond`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
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

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400">{t('supervisorPortal.loading')}</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-1">
          <Logo />
          <span className="text-slate-400 text-lg">—</span>
          <span className="text-workplace-teal-700 text-lg font-medium">{t('supervisorPortal.title')}</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          {t('supervisorPortal.youAreSupervising', {
            student: data.internship.student_name || t('supervisorPortal.aStudent'),
            company: data.internship.company_name || t('supervisorPortal.yourCompany'),
          })}
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-slate-600 mb-3">{t('supervisorPortal.yourDetails')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder={t('supervisorPortal.namePlaceholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('supervisorPortal.emailPlaceholder')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('supervisorPortal.phonePlaceholder')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('supervisorPortal.jobTitlePlaceholder')} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input placeholder={t('supervisorPortal.workingSchedulePlaceholder')} value={form.working_schedule} onChange={(e) => setForm({ ...form, working_schedule: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {saved && <p className="text-sm text-emerald-600">{t('supervisorPortal.saved')}</p>}
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">{t('supervisorPortal.save')}</button>
          </form>
        </div>

        {data.reviews && data.reviews.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-medium text-slate-600 mb-3">{t('supervisorPortal.interimReviews')}</h2>
            <div className="space-y-2">
              {data.reviews.map((r) => (
                <div key={r.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatDate(r.scheduled_date)}</span>
                    <span className="text-xs text-slate-400 capitalize">{t(`internshipDetail.reviews.status.${r.status}`, r.status)}</span>
                  </div>
                  {r.status === 'completed' && r.report && <p className="text-slate-600 mt-1">{r.report}</p>}
                  {r.status === 'scheduled' && (
                    r.supervisor_response === 'pending' ? (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => respondToReview(r.id, 'confirmed')} className="text-xs bg-workplace-teal-600 text-white rounded-lg px-3 py-1">{t('supervisorPortal.confirmAttendance')}</button>
                        <button onClick={() => respondToReview(r.id, 'declined')} className="text-xs border border-slate-300 rounded-lg px-3 py-1 text-slate-600">{t('supervisorPortal.cantAttend')}</button>
                      </div>
                    ) : (
                      <p className="text-xs mt-1">
                        {t('supervisorPortal.youResponded')}<span className={r.supervisor_response === 'confirmed' ? 'text-emerald-600' : 'text-red-600'}>{t(`internshipDetail.reviews.response.${r.supervisor_response}`, r.supervisor_response)}</span>
                      </p>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-600 mb-3">{t('supervisorPortal.weeklyLogs')}</h2>
          {data.logs.length === 0 && <p className="text-sm text-slate-400">{t('supervisorPortal.noLogs')}</p>}
          <div className="space-y-2">
            {data.logs.map((log) => (
              <div key={log.id} className="border border-slate-100 rounded-lg p-3">
                <p className="text-sm font-medium">{formatDate(log.week_starting)} — {log.hours_logged || 0}h</p>
                <p className="text-sm text-slate-600 mb-2">{log.content}</p>
                {log.supervisor_ack ? (
                  <p className="text-xs text-emerald-600">
                    {log.supervisor_comment ? t('supervisorPortal.acknowledgedWithComment', { comment: log.supervisor_comment }) : t('supervisorPortal.acknowledged')}
                  </p>
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
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  return (
    <div className="flex gap-2">
      <input
        placeholder={t('supervisorPortal.commentPlaceholder')} value={comment} onChange={(e) => setComment(e.target.value)}
        className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-xs"
      />
      <button onClick={() => onAck(comment)} className="text-xs bg-workplace-teal-600 text-white rounded-lg px-3 py-1">{t('supervisorPortal.acknowledge')}</button>
    </div>
  );
}
