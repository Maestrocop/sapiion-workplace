import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PhaseProgress from '../components/PhaseProgress';
import CompletedSummary from '../components/CompletedSummary';
import PageHeader from '../components/PageHeader';

const DOC_STATUS_STYLE = {
  submitted: 'bg-slate-100 text-slate-600',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  needs_revision: 'bg-red-100 text-red-600',
};
const OUTCOME_STYLE = {
  pending: 'bg-slate-100 text-slate-500',
  no_reply: 'bg-slate-100 text-slate-400',
  interview_scheduled: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-600',
  accepted: 'bg-emerald-100 text-emerald-700',
};

// ── Searching-phase header stats ─────────────────────────────────────────────
// Informational only — same underlying data as DocumentsPanel/ApplicationsPanel,
// just summarized at a glance the way ILS-dev's header does.
function SearchStatsHeader({ internship }) {
  const { t } = useTranslation();
  const applications = internship.applications || [];
  const total = applications.length;
  const interviews = applications.filter((a) => a.outcome === 'interview_scheduled').length;
  const accepted = applications.filter((a) => a.outcome === 'accepted').length;

  const cvDocs = (internship.documents || []).filter((d) => d.doc_type === 'cv');
  const latestCv = cvDocs.length > 0 ? cvDocs.reduce((a, b) => (b.version > a.version ? b : a)) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xl font-bold text-slate-800">{total}</div>
          <div className="text-xs text-slate-400">{t('myInternship.searchStats.applications')}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-blue-700">{interviews}</div>
          <div className="text-xs text-slate-400">{t('myInternship.searchStats.interviews')}</div>
        </div>
        <div>
          <div className="text-xl font-bold text-emerald-700">{accepted}</div>
          <div className="text-xs text-slate-400">{t('myInternship.searchStats.accepted')}</div>
        </div>
        <div>
          {latestCv ? (
            <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_STATUS_STYLE[latestCv.status]}`}>
              {t('myInternship.searchStats.cvStatus', { status: t(`docStatus.${latestCv.status}`) })}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t('myInternship.searchStats.noCv')}</span>
          )}
          <div className="text-xs text-slate-400 mt-1">{t('myInternship.searchStats.cvStatusLabel')}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-sm font-medium text-slate-600 mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ── Documents (CV / motivation letter) ───────────────────────────────────────
function DocumentsPanel({ internship, onSaved }) {
  const { t } = useTranslation();
  const fileRef = useRef();
  const [docType, setDocType] = useState('cv');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const latestByType = Object.values(
    (internship.documents || []).reduce((acc, d) => {
      if (!acc[d.doc_type] || d.version > acc[d.doc_type].version) acc[d.doc_type] = d;
      return acc;
    }, {})
  );

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return;
    setUploading(true);
    setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    try {
      await api.postFormData(`/api/internships/${internship.id}/documents`, fd);
      setMsg(t('myInternship.documents.uploaded'));
      fileRef.current.value = '';
      onSaved();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Section title={t('myInternship.documents.title')}>
      <div className="space-y-2 mb-4">
        {latestByType.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{t('myInternship.documents.none')}</p>}
        {latestByType.map((doc) => (
          <div key={doc.id} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 capitalize">{t(`myInternship.documents.docType.${doc.doc_type}`, doc.doc_type)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_STATUS_STYLE[doc.status]}`}>{t(`docStatus.${doc.status}`)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{doc.original_name} · v{doc.version}</p>
            {doc.coach_feedback && (
              <p className="text-xs text-amber-700 bg-amber-50 border-l-2 border-amber-400 pl-2 py-1 mt-1 rounded-r">{doc.coach_feedback}</p>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleUpload} className="border-t border-slate-100 pt-3 space-y-2">
        <div className="flex gap-2">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
            <option value="cv">{t('myInternship.documents.docType.cv')}</option>
            <option value="motivation_letter">{t('myInternship.documents.docType.motivation_letter')}</option>
            <option value="other">{t('myInternship.documents.docType.other')}</option>
          </select>
          <input type="file" ref={fileRef} accept=".pdf,.doc,.docx" className="flex-1 text-sm" />
        </div>
        {msg && <p className={`text-xs ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}
        <button type="submit" disabled={uploading} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50">
          {uploading ? t('myInternship.documents.uploading') : t('myInternship.documents.upload')}
        </button>
      </form>
    </Section>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────
function ApplicationsPanel({ internship, onSaved }) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', company_email: '', notes: '' });
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState({});

  async function handleCreate(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post(`/api/internships/${internship.id}/applications`, form);
      setForm({ company_name: '', company_email: '', notes: '' });
      setShowForm(false);
      onSaved();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Section title={t('internshipDetail.applications.title')}>
      <div className="space-y-2 mb-4">
        {(internship.applications || []).length === 0 && <p className="text-sm text-slate-400">{t('internshipDetail.applications.none')}</p>}
        {(internship.applications || []).map((app) => (
          <div key={app.id} className="border border-slate-200 rounded-lg overflow-hidden text-sm">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
              <span className="font-medium text-slate-800">{app.company_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_STYLE[app.outcome]}`}>{t(`applicationOutcome.${app.outcome}`, app.outcome)}</span>
            </div>
            {(app.history || []).length > 0 && (
              <button
                onClick={() => setExpanded((e) => ({ ...e, [app.id]: !e[app.id] }))}
                className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1"
              >
                <span>{expanded[app.id] ? '▾' : '▸'}</span> {t('myInternship.myApplications.historyToggle', { count: app.history.length })}
              </button>
            )}
            {expanded[app.id] && (
              <div className="px-3 pb-2 space-y-1">
                {app.history.map((h) => (
                  <p key={h.id} className="text-xs text-slate-500">{formatDate(h.created_at)} — {t(`applicationOutcome.${h.outcome}`, h.outcome)}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="text-sm text-red-600 mb-2">{msg}</p>}

      <button onClick={() => setShowForm((s) => !s)} className="w-full py-2 border-2 border-dashed border-workplace-teal-200 text-workplace-teal-700 text-sm rounded-lg hover:bg-workplace-teal-50">
        {showForm ? t('common.cancel') : t('myInternship.myApplications.applyButton')}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 space-y-2 border border-workplace-teal-100 rounded-lg p-3 bg-workplace-teal-50/30">
          <input required placeholder={t('myInternship.myApplications.companyNamePlaceholder')} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          <input placeholder={t('myInternship.myApplications.companyEmailPlaceholder')} value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          <textarea placeholder={t('myInternship.myApplications.notesPlaceholder')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} />
          <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">{t('myInternship.myApplications.logButton')}</button>
        </form>
      )}
    </Section>
  );
}

// ── Assignments (on-site phase, read-only — teacher-assigned deliverables) ──
function AssignmentsPanel({ internshipId }) {
  const { t } = useTranslation();
  const [links, setLinks] = useState([]);

  useEffect(() => {
    api.get(`/api/internships/${internshipId}/assignments`).then(setLinks);
  }, [internshipId]);

  if (links.length === 0) return null;

  return (
    <Section title={t('myInternship.assignments.title')}>
      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.id} className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-slate-800">{link.assignment?.title || t('myInternship.assignments.fallbackTitle')}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {link.assignment?.discipline && <span className="mr-3">{link.assignment.discipline}</span>}
                {(link.due_date_override || link.assignment?.due_date) && (
                  <span className="mr-3">{t('myInternship.assignments.due', { date: formatDate(link.due_date_override || link.assignment.due_date) })}</span>
                )}
                {link.assignment?.points_possible && <span>{t('myInternship.assignments.points', { count: link.assignment.points_possible })}</span>}
              </p>
            </div>
            <span className="text-xs bg-workplace-teal-50 text-workplace-teal-700 px-2 py-1 rounded-full font-medium">{t('myInternship.assignments.todo')}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

const REVIEW_STATUS_STYLE = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

// ── Interim reviews (read-only for the student) ──────────────────────────────
function ReviewsPanel({ internship, onSaved }) {
  const { t } = useTranslation();
  const reviews = internship.reviews || [];
  if (reviews.length === 0) return null;

  async function respond(reviewId, response) {
    await api.put(`/api/internships/${internship.id}/reviews/${reviewId}/respond`, { response });
    onSaved();
  }

  return (
    <Section title={t('internshipDetail.reviews.title')}>
      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="border border-slate-100 rounded-lg p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatDate(r.scheduled_date)}{r.reviewer && ` — ${r.reviewer.first_name} ${r.reviewer.last_name}`}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_STYLE[r.status]}`}>{t(`internshipDetail.reviews.status.${r.status}`)}</span>
            </div>
            {r.status === 'completed' && r.report && <p className="text-slate-600 mt-1">{r.report}</p>}
            {r.status === 'scheduled' && (
              r.student_response === 'pending' ? (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => respond(r.id, 'confirmed')} className="text-xs bg-workplace-teal-600 text-white rounded-lg px-3 py-1">{t('myInternship.reviews.confirmAttendance')}</button>
                  <button onClick={() => respond(r.id, 'declined')} className="text-xs border border-slate-300 rounded-lg px-3 py-1 text-slate-600">{t('myInternship.reviews.cantAttend')}</button>
                </div>
              ) : (
                <p className="text-xs mt-1">
                  {t('myInternship.reviews.youResponded')}<span className={r.student_response === 'confirmed' ? 'text-emerald-600' : 'text-red-600'}>{t(`internshipDetail.reviews.response.${r.student_response}`)}</span>
                </p>
              )
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Signature (placement phase) ──────────────────────────────────────────────
function SignaturePanel({ internship, onSaved }) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get(`/api/internships/${internship.id}/placement-checklist`).then((items) => {
      const item = items.find((i) => i.definition.check_key === 'student_signed');
      setSigned(Boolean(item?.check?.is_completed));
      setChecking(false);
    });
  }, [internship.id]);

  async function handleSign() {
    if (!checked) return;
    await api.patch(`/api/internships/${internship.id}/placement-checklist/student_signed`, { is_completed: true, notes: 'Signed by student' });
    setSigned(true);
    onSaved();
  }

  if (checking) return null;

  if (signed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-medium text-emerald-700 text-sm">{t('myInternship.signature.signedTitle')}</p>
          <p className="text-xs text-emerald-600">{t('myInternship.signature.signedSubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <Section title={t('myInternship.signature.title')}>
      <p className="text-sm text-slate-500 mb-3">{t('myInternship.signature.intro')}</p>
      <label className="flex items-start gap-2 cursor-pointer mb-3">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
        <span className="text-sm text-slate-700">{t('myInternship.signature.confirmLabel')}</span>
      </label>
      <button onClick={handleSign} disabled={!checked} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40">
        {t('myInternship.signature.signButton')}
      </button>
    </Section>
  );
}

// ── Reflection (evaluating phase) ────────────────────────────────────────────
function ReflectionPanel({ internship, onSaved }) {
  const { t } = useTranslation();
  const studentAssessment = (internship.assessments || []).find((a) => a.assessor_role === 'student');
  const [reflection, setReflection] = useState(studentAssessment?.reflection || '');
  const [competencyNotes, setCompetencyNotes] = useState(studentAssessment?.competency_notes || '');
  const [msg, setMsg] = useState('');

  async function save(submit) {
    setMsg('');
    try {
      await api.post(`/api/internships/${internship.id}/reflection`, { reflection, competency_notes: competencyNotes, submit });
      setMsg(submit ? t('myInternship.reflection.submittedMsg') : t('myInternship.reflection.draftSaved'));
      onSaved();
    } catch (err) {
      setMsg(err.message);
    }
  }

  const teacherScore = (internship.assessments || []).find((a) => a.assessor_role === 'teacher' && a.submitted_at);
  const supervisorScore = (internship.assessments || []).find((a) => a.assessor_role === 'supervisor' && a.submitted_at);

  return (
    <div className="space-y-4">
      {(teacherScore || supervisorScore) && (
        <Section title={t('myInternship.assessment.title')}>
          <div className="grid grid-cols-2 gap-3">
            {[teacherScore, supervisorScore].map((a, i) => a && (
              <div key={i} className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 capitalize">{t(`assessorRoles.${a.assessor_role}`, a.assessor_role)}</p>
                <p className="text-2xl font-bold text-emerald-700">{a.score ?? '—'}<span className="text-xs text-slate-400">/{a.max_score}</span></p>
                {a.feedback && <p className="text-xs text-slate-600 mt-1 italic">"{a.feedback}"</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={t('myInternship.reflection.yourReflection')}>
        {studentAssessment?.submitted_at ? (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{t('myInternship.reflection.submitted')}</span>
        ) : (
          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">{t('myInternship.reflection.notSubmitted')}</span>
        )}
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('myInternship.reflection.whatDidYouLearn')}</label>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('myInternship.reflection.competenciesDeveloped')}</label>
            <textarea value={competencyNotes} onChange={(e) => setCompetencyNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={() => save(false)} className="text-sm border border-slate-300 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50">{t('myInternship.reflection.saveDraft')}</button>
            <button onClick={() => save(true)} disabled={!reflection} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50">
              {studentAssessment?.submitted_at ? t('myInternship.reflection.update') : t('myInternship.reflection.submit')}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function MyInternshipPage() {
  const { t } = useTranslation();
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

  if (loading) return <p className="text-slate-400 text-sm">{t('common.loading')}</p>;

  if (!internship) {
    return <p className="text-slate-400 text-sm">{t('myInternship.noPlacement')}</p>;
  }

  const completedAssessments = (internship.assessments || []).filter((a) => a.is_completed && a.assessor_role !== 'student');

  return (
    <div>
      <PageHeader
        eyebrow={t('myInternship.eyebrow')}
        title={t('myInternship.title')}
        subtitle={internship.phase === 'searching' ? t('myInternship.subtitleSearch') : (internship.company_name || t('myInternship.subtitlePlaced'))}
        actions={<PhaseProgress phase={internship.phase} />}
      />

      {internship.phase === 'searching' && <SearchStatsHeader internship={internship} />}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-600 mb-2">{t('myInternship.placementDetails.title')}</h2>
          <p className="text-sm text-slate-700">{internship.company_name || t('myInternship.placementDetails.notAssigned')}</p>
          {internship.start_date && (
            <p className="text-sm text-slate-500">{formatDate(internship.start_date)} → {formatDate(internship.end_date)}</p>
          )}
          <p className="text-xs text-slate-400 mt-2 capitalize">{t('myInternship.placementDetails.status', { status: t(`internshipStatus.${internship.status}`, internship.status) })}</p>
        </div>

        {completedAssessments.length > 0 && internship.phase !== 'evaluating' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-600 mb-2">{t('myInternship.assessment.title')}</h2>
            {completedAssessments.map((a) => (
              <div key={a.id} className="text-sm mb-2">
                <p className="font-medium capitalize">{t(`assessorRoles.${a.assessor_role}`, a.assessor_role)}: {a.score}/{a.max_score}</p>
                {a.feedback && <p className="text-slate-600">{a.feedback}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Searching — documents and applications */}
        {internship.phase === 'searching' && (
          <>
            <DocumentsPanel internship={internship} onSaved={load} />
            <ApplicationsPanel internship={internship} onSaved={load} />
          </>
        )}

        {/* Placed — sign the agreement */}
        {internship.phase === 'placed' && (
          <SignaturePanel internship={internship} onSaved={load} />
        )}

        {/* On-site — teacher-assigned deliverables */}
        {internship.phase === 'on_site' && (
          <AssignmentsPanel internshipId={internship.id} />
        )}

        {/* Interim reviews (read-only) — not phase-gated: a review from an
            earlier phase should stay visible as a record, not disappear
            once the internship moves on. The component itself renders
            nothing if there are no reviews yet. */}
        <ReviewsPanel internship={internship} onSaved={load} />

        {/* On-site — daily activity logs */}
        {(internship.phase === 'on_site' || internship.phase === 'completed') && (
          <Section title={t('internshipDetail.dailyLogs.title')}>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

            {internship.phase === 'on_site' && (
              <form onSubmit={addLog} className="space-y-2 mb-4">
                <input
                  placeholder={t('myInternship.dailyLogs.titlePlaceholder')} value={logForm.title} onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date" value={logForm.week_starting} onChange={(e) => setLogForm({ ...logForm, week_starting: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number" placeholder={t('internshipDetail.dailyLogs.hoursPlaceholder')} value={logForm.hours_logged}
                    onChange={(e) => setLogForm({ ...logForm, hours_logged: e.target.value })}
                    className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  required placeholder={t('internshipDetail.dailyLogs.contentPlaceholder')} value={logForm.content}
                  onChange={(e) => setLogForm({ ...logForm, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2}
                />
                <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">
                  {t('internshipDetail.dailyLogs.addLog')}
                </button>
              </form>
            )}

            {(internship.activityLogs || []).length === 0 && <p className="text-sm text-slate-400">{t('myInternship.dailyLogs.none')}</p>}
            <div className="space-y-2">
              {(internship.activityLogs || []).map((log) => (
                <div key={log.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <p className="font-medium">{log.title || formatDate(log.week_starting)} — {log.hours_logged || 0}h {log.supervisor_ack && <span className="text-emerald-600 text-xs">{t('internshipDetail.dailyLogs.acknowledged')}</span>}</p>
                  <p className="text-slate-600">{log.content}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Evaluating — reflection + scores */}
        {internship.phase === 'evaluating' && (
          <ReflectionPanel internship={internship} onSaved={load} />
        )}

        {/* Completed — final summary */}
        {internship.phase === 'completed' && internship.completed_at && (
          <CompletedSummary internship={internship} />
        )}
      </div>
    </div>
  );
}
