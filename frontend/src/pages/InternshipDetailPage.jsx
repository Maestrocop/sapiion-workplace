import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PhaseProgress from '../components/PhaseProgress';
import CompletedSummary from '../components/CompletedSummary';
import PageHeader from '../components/PageHeader';

const PHASE_ADVANCE_LABEL = { placed: 'Mark as on-site', on_site: 'Move to evaluating' };
const PHASE_ADVANCE_CONFIRM = {
  placed: 'Mark this internship as on-site? The student and coordinator will see it move to the On-site phase.',
  on_site: 'Move this internship to Evaluating?',
};
const PHASE_REVERSE_LABEL = { on_site: 'Move back to placed', evaluating: 'Move back to on-site' };
const PHASE_DISPLAY_LABEL = { placed: 'Placed', on_site: 'On-site', evaluating: 'Evaluating' };

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-sm font-medium text-slate-600 mb-3">{title}</h2>
      {children}
    </div>
  );
}

const REVIEW_STATUS_STYLE = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function ReviewCompleteForm({ internshipId, review, onDone }) {
  const [report, setReport] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/internships/${internshipId}/reviews/${review.id}/complete`, { report });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <textarea
        required placeholder="Visit report — discussion, what's going well, what isn't"
        value={report} onChange={(e) => setReport(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={3}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-3 py-1.5">Complete review</button>
    </form>
  );
}

function ReviewsPanel({ internship, onSaved }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ scheduled_date: '', supervisor_id: '' });
  const [completingId, setCompletingId] = useState(null);
  const [error, setError] = useState('');

  async function schedule(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internships/${internship.id}/reviews`, {
        scheduled_date: form.scheduled_date,
        supervisor_id: form.supervisor_id ? Number(form.supervisor_id) : undefined,
      });
      setForm({ scheduled_date: '', supervisor_id: '' });
      setShowForm(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancel(reviewId) {
    if (!window.confirm('Cancel this scheduled review?')) return;
    await api.put(`/api/internships/${internship.id}/reviews/${reviewId}/cancel`, {});
    onSaved();
  }

  return (
    <Section title="Interim reviews">
      <div className="space-y-2 mb-3">
        {(internship.reviews || []).length === 0 && <p className="text-sm text-slate-400">No reviews scheduled yet.</p>}
        {(internship.reviews || []).map((r) => (
          <div key={r.id} className="border border-slate-100 rounded-lg p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatDate(r.scheduled_date)}{r.reviewer && ` — ${r.reviewer.first_name} ${r.reviewer.last_name}`}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
            {r.status === 'scheduled' && (
              <p className="text-xs text-slate-400 mt-1">
                Student: <span className={r.student_response === 'confirmed' ? 'text-emerald-600' : r.student_response === 'declined' ? 'text-red-600' : 'text-amber-600'}>{r.student_response}</span>
                {r.supervisor_id && <> · Supervisor: <span className={r.supervisor_response === 'confirmed' ? 'text-emerald-600' : r.supervisor_response === 'declined' ? 'text-red-600' : 'text-amber-600'}>{r.supervisor_response}</span></>}
              </p>
            )}
            {r.status === 'completed' && (
              <>
                <p className="text-slate-600 mt-1">{r.report}</p>
                <p className="text-xs text-slate-400 mt-1">Hours logged at review: {r.hours_logged_snapshot}</p>
              </>
            )}
            {r.status === 'scheduled' && (
              completingId === r.id ? (
                <ReviewCompleteForm internshipId={internship.id} review={r} onDone={() => { setCompletingId(null); onSaved(); }} />
              ) : (
                <div className="flex gap-3 mt-1">
                  <button onClick={() => setCompletingId(r.id)} className="text-xs text-workplace-teal-700 hover:underline">Complete</button>
                  <button onClick={() => cancel(r.id)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <button onClick={() => setShowForm((s) => !s)} className="w-full py-2 border-2 border-dashed border-workplace-teal-200 text-workplace-teal-700 text-sm rounded-lg hover:bg-workplace-teal-50">
        {showForm ? 'Cancel' : '+ Schedule review'}
      </button>

      {showForm && (
        <form onSubmit={schedule} className="mt-3 space-y-2 border border-workplace-teal-100 rounded-lg p-3 bg-workplace-teal-50/30">
          <input required type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          {(internship.supervisors || []).length > 0 && (
            <select value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Supervisor attending (optional)</option>
              {internship.supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Schedule</button>
        </form>
      )}
    </Section>
  );
}

export default function InternshipDetailPage() {
  const { id } = useParams();
  const [internship, setInternship] = useState(null);
  const [error, setError] = useState('');
  const [phaseMessage, setPhaseMessage] = useState('');

  const [companyForm, setCompanyForm] = useState({ company_name: '', company_address: '', start_date: '', end_date: '' });
  const [supervisorForm, setSupervisorForm] = useState({ name: '', email: '', job_title: '' });
  const [logForm, setLogForm] = useState({ week_starting: '', hours_logged: '', content: '' });
  const [assessmentForm, setAssessmentForm] = useState({ score: '', feedback: '' });
  const [completeForm, setCompleteForm] = useState({ completion_note: '' });
  const [completeMessage, setCompleteMessage] = useState('');

  async function load() {
    const data = await api.get(`/api/internships/${id}`);
    setInternship(data);
    setCompanyForm({
      company_name: data.company_name || '', company_address: data.company_address || '',
      start_date: data.start_date || '', end_date: data.end_date || '',
    });
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCompany(e) {
    e.preventDefault();
    setError('');
    try { await api.put(`/api/internships/${id}`, companyForm); load(); }
    catch (err) { setError(err.message); }
  }

  async function addSupervisor(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internships/${id}/supervisors`, supervisorForm);
      setSupervisorForm({ name: '', email: '', job_title: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function addLog(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internships/${id}/activity-logs`, {
        ...logForm, hours_logged: logForm.hours_logged ? Number(logForm.hours_logged) : undefined,
      });
      setLogForm({ week_starting: '', hours_logged: '', content: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function submitAssessment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/internships/${id}/assessments`, {
        assessor_role: 'teacher', score: Number(assessmentForm.score), feedback: assessmentForm.feedback, is_completed: true,
      });
      setAssessmentForm({ score: '', feedback: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function advancePhase() {
    const currentPhase = internship.phase;
    if (!window.confirm(PHASE_ADVANCE_CONFIRM[currentPhase])) return;

    setError('');
    setPhaseMessage('');
    try {
      const updated = await api.post(`/api/internships/${id}/advance-phase`);
      setPhaseMessage(`✓ Moved to ${PHASE_DISPLAY_LABEL[updated.phase] || updated.phase}`);
      setTimeout(() => setPhaseMessage(''), 4000);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reversePhase() {
    const reason = window.prompt('Why are you moving this phase back? (required — kept as a record)');
    if (reason === null) return; // cancelled
    if (!reason.trim()) { setError('A reason is required to reverse a phase.'); return; }

    setError('');
    setPhaseMessage('');
    try {
      const updated = await api.post(`/api/internships/${id}/reverse-phase`, { reason: reason.trim() });
      setPhaseMessage(`✓ Moved back to ${PHASE_DISPLAY_LABEL[updated.phase] || updated.phase}`);
      setTimeout(() => setPhaseMessage(''), 4000);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    if (!window.confirm('Mark this internship as complete? This is final — the student will see their finished-state summary.')) return;
    setError('');
    setCompleteMessage('');
    try {
      await api.post(`/api/internships/${id}/complete`, {
        completion_note: completeForm.completion_note || undefined,
      });
      setCompleteMessage('✓ Internship marked complete');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleCheck(checkKey, current) {
    try {
      await api.patch(`/api/internships/${id}/placement-checklist/${checkKey}`, { is_completed: !current });
      load();
    } catch (err) { setError(err.message); }
  }

  if (!internship) return <p className="text-slate-400 text-sm">Loading…</p>;

  const supervisorLink = (token) => `${window.location.origin}/supervisor/${token}`;

  return (
    <div>
      <Link to="/campaigns" className="text-sm text-workplace-teal-700 hover:underline">&larr; Back</Link>
      <div className="mt-2">
        <PageHeader
          title={`${internship.student?.first_name || ''} ${internship.student?.last_name || ''}`}
          subtitle={internship.phase === 'searching' ? 'Searching for a company' : (internship.company_name || 'No company yet')}
          actions={<PhaseProgress phase={internship.phase} />}
        >
          {(phaseMessage || PHASE_REVERSE_LABEL[internship.phase] || PHASE_ADVANCE_LABEL[internship.phase]) && (
            <div className="flex items-center justify-end gap-3">
              {phaseMessage && <span className="text-sm text-emerald-600">{phaseMessage}</span>}
              {PHASE_REVERSE_LABEL[internship.phase] && (
                <button onClick={reversePhase} className="border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm rounded-lg px-4 py-2">
                  ← {PHASE_REVERSE_LABEL[internship.phase]}
                </button>
              )}
              {PHASE_ADVANCE_LABEL[internship.phase] && (
                <button onClick={advancePhase} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">
                  {PHASE_ADVANCE_LABEL[internship.phase]}
                </button>
              )}
            </div>
          )}
        </PageHeader>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {internship.phase === 'completed' && internship.completed_at && (
        <div className="mb-6">
          <CompletedSummary internship={internship} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Section title="Company">
          <form onSubmit={saveCompany} className="space-y-2">
            <input placeholder="Company name" value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address" value={companyForm.company_address} onChange={(e) => setCompanyForm({ ...companyForm, company_address: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="date" value={companyForm.start_date || ''} onChange={(e) => setCompanyForm({ ...companyForm, start_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={companyForm.end_date || ''} onChange={(e) => setCompanyForm({ ...companyForm, end_date: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Save</button>
          </form>
        </Section>

        <Section title="Supervisors">
          <div className="space-y-2 mb-3">
            {(internship.supervisors || []).map((s) => (
              <div key={s.id} className="text-sm border border-slate-100 rounded-lg p-2">
                <p className="font-medium">{s.name} <span className="text-slate-400 font-normal">{s.job_title}</span></p>
                <p className="text-xs text-slate-500 break-all">Link: {supervisorLink(s.access_token)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addSupervisor} className="space-y-2">
            <input required placeholder="Name" value={supervisorForm.name} onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Email" value={supervisorForm.email} onChange={(e) => setSupervisorForm({ ...supervisorForm, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Job title" value={supervisorForm.job_title} onChange={(e) => setSupervisorForm({ ...supervisorForm, job_title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Add supervisor</button>
          </form>
        </Section>

        <Section title="Daily Activity Logs">
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {(internship.activityLogs || []).map((l) => (
              <div key={l.id} className="text-sm border border-slate-100 rounded-lg p-2">
                <p className="font-medium">{formatDate(l.week_starting)} — {l.hours_logged || 0}h {l.supervisor_ack && <span className="text-emerald-600 text-xs">✓ acknowledged</span>}</p>
                <p className="text-slate-600">{l.content}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addLog} className="space-y-2">
            <div className="flex gap-2">
              <input type="date" value={logForm.week_starting} onChange={(e) => setLogForm({ ...logForm, week_starting: e.target.value })} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Hours worked" value={logForm.hours_logged} onChange={(e) => setLogForm({ ...logForm, hours_logged: e.target.value })} className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea required placeholder="What did you do and learn today?" value={logForm.content} onChange={(e) => setLogForm({ ...logForm, content: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">+ Add log</button>
          </form>
        </Section>

        <Section title="Assessment (teacher)">
          <div className="space-y-2 mb-3">
            {(internship.assessments || []).filter((a) => a.assessor_role !== 'student').map((a) => (
              <div key={a.id} className="text-sm border border-slate-100 rounded-lg p-2">
                <p className="font-medium capitalize">{a.assessor_role}: {a.score ?? '—'}/{a.max_score}</p>
                <p className="text-slate-600">{a.feedback}</p>
              </div>
            ))}
          </div>
          {(() => {
            const studentReflection = (internship.assessments || []).find((a) => a.assessor_role === 'student' && (a.reflection || a.competency_notes));
            if (!studentReflection) return null;
            return (
              <div className="text-sm border border-slate-100 rounded-lg p-2 mb-3 bg-slate-50">
                <p className="font-medium text-slate-700">Student reflection {studentReflection.submitted_at ? <span className="text-xs text-emerald-600 font-normal">(submitted)</span> : <span className="text-xs text-amber-600 font-normal">(draft)</span>}</p>
                {studentReflection.reflection && <p className="text-slate-600 mt-1">{studentReflection.reflection}</p>}
                {studentReflection.competency_notes && <p className="text-slate-500 mt-1 text-xs">Competencies: {studentReflection.competency_notes}</p>}
              </div>
            );
          })()}
          <form onSubmit={submitAssessment} className="space-y-2">
            <input type="number" placeholder="Score (0-100)" value={assessmentForm.score} onChange={(e) => setAssessmentForm({ ...assessmentForm, score: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <textarea placeholder="Feedback" value={assessmentForm.feedback} onChange={(e) => setAssessmentForm({ ...assessmentForm, feedback: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Submit assessment</button>
          </form>
        </Section>

        <Section title="Placement checklist">
          <ChecklistLoader internshipId={id} onToggle={toggleCheck} />
        </Section>

        {internship.phase === 'evaluating' && (
          <Section title="Complete internship">
            <p className="text-sm text-slate-500 mb-3">Total hours and final score are calculated automatically from activity logs and submitted assessments — nothing to enter there.</p>
            <form onSubmit={handleComplete} className="space-y-2">
              <textarea placeholder="Completion note (optional)" value={completeForm.completion_note} onChange={(e) => setCompleteForm({ ...completeForm, completion_note: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
              {completeMessage && <p className="text-sm text-emerald-600">{completeMessage}</p>}
              <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Mark as complete</button>
            </form>
          </Section>
        )}

        <ReviewsPanel internship={internship} onSaved={load} />

        <Section title="Applications">
          <div className="space-y-2">
            {(internship.applications || []).length === 0 && <p className="text-sm text-slate-400">No applications yet.</p>}
            {(internship.applications || []).map((a) => (
              <div key={a.id} className="text-sm border border-slate-100 rounded-lg p-2">
                <p className="font-medium">{a.company_name} <span className="text-xs text-slate-400">{a.outcome}</span></p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {internship.phaseHistory && internship.phaseHistory.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="text-slate-400 hover:text-slate-600 cursor-pointer select-none">
            Phase reversal history ({internship.phaseHistory.length})
          </summary>
          <div className="mt-2 space-y-2 bg-white border border-slate-200 rounded-xl p-4">
            {internship.phaseHistory.map((h) => (
              <div key={h.id} className="text-slate-500">
                <span className="font-medium text-slate-700">{PHASE_DISPLAY_LABEL[h.from_phase] || h.from_phase} → {PHASE_DISPLAY_LABEL[h.to_phase] || h.to_phase}</span>
                {' — '}"{h.reason}"
                {h.reversedBy && ` — ${h.reversedBy.first_name} ${h.reversedBy.last_name}`}
                {' · '}{formatDate(h.created_at)}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ChecklistLoader({ internshipId, onToggle }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get(`/api/internships/${internshipId}/placement-checklist`).then(setItems);
  }, [internshipId]);

  if (!items) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-1">
      {items.map(({ definition, check }) => (
        <label key={definition.id} className="flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox" checked={Boolean(check?.is_completed)}
            onChange={() => onToggle(definition.check_key, Boolean(check?.is_completed))}
          />
          <span className={check?.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{definition.label}</span>
        </label>
      ))}
    </div>
  );
}
