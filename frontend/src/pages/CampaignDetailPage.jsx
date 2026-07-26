import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setCampaign(await api.get(`/api/internship-campaigns/${id}`));
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEnroll(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internship-campaigns/${id}/enroll`, { student_ids: [Number(studentId)] });
      setStudentId('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!campaign) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div>
      <Link to="/campaigns" className="text-sm text-workplace-teal-700 hover:underline">&larr; Internships</Link>
      <h1 className="text-lg font-semibold text-slate-800 mt-2">{campaign.name}</h1>
      <p className="text-sm text-slate-500 mb-6">{campaign.class?.name} · {campaign.academicYear?.label} · {campaign.status}</p>

      <form onSubmit={handleEnroll} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-2 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Student user ID</label>
          <input
            required value={studentId} onChange={(e) => setStudentId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40"
          />
        </div>
        <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">
          Enroll student
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <h2 className="text-sm font-medium text-slate-600 mb-2">Enrolled students</h2>
      <div className="grid gap-2">
        {(campaign.studentRecords || []).length === 0 && <p className="text-slate-400 text-sm">No students enrolled yet.</p>}
        {(campaign.studentRecords || []).map((internship) => (
          <Link
            key={internship.id} to={`/internships/${internship.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-workplace-teal-400"
          >
            <div>
              <p className="font-medium text-slate-800">{internship.student?.first_name} {internship.student?.last_name}</p>
              <p className="text-sm text-slate-500">{internship.company_name || 'No company yet'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{internship.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
