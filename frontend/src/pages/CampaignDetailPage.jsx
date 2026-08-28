import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  async function load() {
    const c = await api.get(`/api/internship-campaigns/${id}`);
    setCampaign(c);
    if (c.class?.id) {
      const students = await api.get(`/api/users?role=student`);
      setClassStudents(students.filter((s) => String(s.class_id) === String(c.class.id)));
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const enrolledIds = useMemo(
    () => new Set((campaign?.studentRecords || []).map((r) => String(r.student?.id))),
    [campaign]
  );

  const unenrolled = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classStudents
      .filter((s) => !enrolledIds.has(String(s.id)))
      .filter((s) => !q || `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(q));
  }, [classStudents, enrolledIds, search]);

  function toggle(studentId) {
    setSelected((sel) => ({ ...sel, [studentId]: !sel[studentId] }));
  }

  async function handleEnroll() {
    setError('');
    const ids = Object.keys(selected).filter((k) => selected[k]).map(Number);
    if (ids.length === 0) return;
    setEnrolling(true);
    try {
      await api.post(`/api/internship-campaigns/${id}/enroll`, { student_ids: ids });
      setSelected({});
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrolling(false);
    }
  }

  if (!campaign) return <p className="text-slate-400 text-sm">Loading…</p>;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <Link to="/campaigns" className="text-sm text-workplace-teal-700 hover:underline">&larr; Internships</Link>
      <h1 className="text-lg font-semibold text-slate-800 mt-2">{campaign.name}</h1>
      <p className="text-sm text-slate-500 mb-6">{campaign.class?.name} · {campaign.academicYear?.label} · {campaign.status}</p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-600">Enroll students from {campaign.class?.name || 'this class'}</h2>
          {selectedCount > 0 && (
            <button
              onClick={handleEnroll} disabled={enrolling}
              className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {enrolling ? 'Enrolling…' : `Enroll selected (${selectedCount})`}
            </button>
          )}
        </div>

        <input
          placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="max-h-72 overflow-y-auto space-y-1">
          {classStudents.length === 0 && (
            <p className="text-sm text-slate-400">No students found in {campaign.class?.name || 'this class'} yet — assign students to it from the Users page.</p>
          )}
          {classStudents.length > 0 && unenrolled.length === 0 && (
            <p className="text-sm text-slate-400">Everyone in this class is already enrolled.</p>
          )}
          {unenrolled.map((s) => (
            <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-sm cursor-pointer">
              <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} />
              <span className="font-medium text-slate-700">{s.first_name} {s.last_name}</span>
              <span className="text-slate-400">{s.email}</span>
            </label>
          ))}
        </div>
      </div>

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
