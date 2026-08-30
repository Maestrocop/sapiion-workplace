import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PageHeader from '../components/PageHeader';

const RISK_STYLE = {
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
};
const RISK_LABEL = { red: 'At risk', amber: 'Needs attention', green: 'On track' };

export default function MonitoringPage() {
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
      <PageHeader title="Execution Monitoring" subtitle="Students currently on-site — at-risk overview" />

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && (
        <>
          <p className="text-sm text-slate-500 mb-4">{rows.length} student{rows.length === 1 ? '' : 's'} in execution</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-red-600">{counts.red}</p>
              <p className="text-sm text-slate-500">At risk</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-amber-600">{counts.amber}</p>
              <p className="text-sm text-slate-500">Needs attention</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-emerald-600">{counts.green}</p>
              <p className="text-sm text-slate-500">On track</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Hours</th>
                  <th className="px-4 py-2">Last log</th>
                  <th className="px-4 py-2">Supervisor</th>
                  <th className="px-4 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No students currently on-site.</td></tr>
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
                      {r.days_since_last_log === null ? 'Never' : `${r.days_since_last_log}d ago`}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {Number(r.supervisor_count) > 0 ? '✓ Connected' : 'Not assigned'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STYLE[r.risk]}`}>{RISK_LABEL[r.risk]}</span>
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
