import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PageHeader from '../components/PageHeader';

const RISK_STYLE = {
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
};

export default function MonitoringPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/internships/execution-risk')
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    red: rows.filter((r) => r.risk === 'red').length,
    amber: rows.filter((r) => r.risk === 'amber').length,
    green: rows.filter((r) => r.risk === 'green').length,
  };

  return (
    <div>
      <PageHeader title={t('monitoring.title')} subtitle={t('monitoring.subtitle')} />

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-slate-400 text-sm">{t('common.loading')}</p>}

      {!loading && (
        <>
          <p className="text-sm text-slate-500 mb-4">{t('monitoring.studentCount', { count: rows.length })}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-red-600">{counts.red}</p>
              <p className="text-sm text-slate-500">{t('monitoring.risk.red')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-amber-600">{counts.amber}</p>
              <p className="text-sm text-slate-500">{t('monitoring.risk.amber')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-emerald-600">{counts.green}</p>
              <p className="text-sm text-slate-500">{t('monitoring.risk.green')}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2">{t('monitoring.table.student')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.company')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.period')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.hours')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.lastLog')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.supervisor')}</th>
                  <th className="px-4 py-2">{t('monitoring.table.risk')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">{t('monitoring.noStudents')}</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link to={`/internships/${r.id}`} className="font-medium text-slate-700 hover:text-workplace-teal-700">
                        {r.first_name} {r.last_name}
                      </Link>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{r.company_name || '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDate(r.start_date)} → {formatDate(r.end_date)}</td>
                    <td className="px-4 py-2 text-slate-500">{Number(r.total_hours)}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {r.days_since_last_log === null ? t('monitoring.never') : t('monitoring.daysAgo', { count: r.days_since_last_log })}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {Number(r.supervisor_count) > 0 ? t('monitoring.connected') : t('monitoring.notAssigned')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STYLE[r.risk]}`}>{t(`monitoring.risk.${r.risk}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
