import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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

function EditCampaignModal({ campaign, onClose, onSaved, onDeleted }) {
  const { t } = useTranslation();
  const [name, setName] = useState(campaign.name);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setError('');
    setSaved(false);
    try {
      await api.put(`/api/internship-campaigns/${campaign.id}`, { name });
      setSaved(true);
      onSaved();
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('campaignDetail.editModal.deleteConfirm', { name: campaign.name }))) return;
    setError('');
    try {
      await api.del(`/api/internship-campaigns/${campaign.id}`);
      onDeleted();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-800">{t('campaignDetail.editModal.title')}</h2>
        <p className="text-sm text-slate-500 mb-4">{t('campaignDetail.editModal.subtitle')}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('campaignDetail.editModal.name')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {saved && <p className="text-sm text-emerald-600">{t('campaignDetail.editModal.saved')}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-between items-center mt-6">
          <button onClick={handleDelete} className="text-sm text-red-600 hover:underline px-2 py-2">{t('campaignDetail.editModal.delete')}</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-slate-500 px-4 py-2">{t('common.cancel')}</button>
            <button onClick={save} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">{t('campaignDetail.editModal.save')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [editing, setEditing] = useState(false);

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

  if (!campaign) return <p className="text-slate-400 text-sm">{t('common.loading')}</p>;

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const className = campaign.class?.name || t('campaignDetail.thisClass');
  const isAdmin = (user?.roles || []).includes('admin');
  const canEdit = isAdmin || String(campaign.coordinator?.id) === String(user?.id);

  return (
    <div>
      <Link to="/campaigns" className="text-sm text-workplace-teal-700 hover:underline">{t('campaignDetail.backLink')}</Link>
      <div className="mt-2">
        <PageHeader
          title={campaign.name}
          subtitle={`${campaign.class?.name || ''} · ${campaign.academicYear?.label || ''} · ${campaign.campaign_type}`}
          actions={
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[campaign.status]}`}>{t(`campaigns.status.${campaign.status}`)}</span>
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 border border-white/30 transition"
                >
                  {t('common.edit')}
                </button>
              )}
            </div>
          }
        />
      </div>

      {editing && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setEditing(false)}
          onSaved={() => load()}
          onDeleted={() => navigate('/campaigns')}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-600">{t('campaignDetail.enrollFrom', { className })}</h2>
          {selectedCount > 0 && (
            <button
              onClick={handleEnroll} disabled={enrolling}
              className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {enrolling ? t('campaignDetail.enrolling') : t('campaignDetail.enrollSelected', { count: selectedCount })}
            </button>
          )}
        </div>

        <input
          placeholder={t('campaignDetail.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="max-h-72 overflow-y-auto space-y-1">
          {classStudents.length === 0 && (
            <p className="text-sm text-slate-400">{t('campaignDetail.noStudentsInClass', { className })}</p>
          )}
          {classStudents.length > 0 && unenrolled.length === 0 && (
            <p className="text-sm text-slate-400">{t('campaignDetail.everyoneEnrolled')}</p>
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

      <h2 className="text-sm font-medium text-slate-600 mb-2">{t('campaignDetail.enrolledStudents')}</h2>
      <div className="grid gap-2">
        {(campaign.studentRecords || []).length === 0 && <p className="text-slate-400 text-sm">{t('campaignDetail.noneEnrolled')}</p>}
        {(campaign.studentRecords || []).map((internship) => (
          <Link
            key={internship.id} to={`/internships/${internship.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-workplace-teal-400"
          >
            <div>
              <p className="font-medium text-slate-800">{internship.student?.first_name} {internship.student?.last_name}</p>
              <p className="text-sm text-slate-500">{internship.company_name || t('campaignDetail.noCompanyYet')}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t(`internshipStatus.${internship.status}`, internship.status)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
