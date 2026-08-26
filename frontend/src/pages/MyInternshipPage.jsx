import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PhaseProgress from '../components/PhaseProgress';

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
      setMsg('✓ Uploaded');
      fileRef.current.value = '';
      onSaved();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Section title="Documents">
      <div className="space-y-2 mb-4">
        {latestByType.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No documents uploaded yet.</p>}
        {latestByType.map((doc) => (
          <div key={doc.id} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 capitalize">{doc.doc_type.replace('_', ' ')}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_STATUS_STYLE[doc.status]}`}>{doc.status.replace('_', ' ')}</span>
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
            <option value="cv">CV</option>
            <option value="motivation_letter">Motivation letter</option>
            <option value="other">Other</option>
          </select>
          <input type="file" ref={fileRef} accept=".pdf,.doc,.docx" className="flex-1 text-sm" />
        </div>
        {msg && <p className={`text-xs ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}
        <button type="submit" disabled={uploading} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </Section>
  );
}

// ── Applications ──────────────────────────────────────────────────────────────
function ApplicationsPanel({ internship, onSaved }) {
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
    <Section title="Applications">
      <div className="space-y-2 mb-4">
        {(internship.applications || []).length === 0 && <p className="text-sm text-slate-400">No applications yet.</p>}
        {(internship.applications || []).map((app) => (
          <div key={app.id} className="border border-slate-200 rounded-lg overflow-hidden text-sm">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
              <span className="font-medium text-slate-800">{app.company_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_STYLE[app.outcome]}`}>{app.outcome.replace('_', ' ')}</span>
            </div>
            {(app.history || []).length > 0 && (
              <button
                onClick={() => setExpanded((e) => ({ ...e, [app.id]: !e[app.id] }))}
                className="w-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1"
              >
                <span>{expanded[app.id] ? '▾' : '▸'}</span> History ({app.history.length})
              </button>
            )}
            {expanded[app.id] && (
              <div className="px-3 pb-2 space-y-1">
                {app.history.map((h) => (
                  <p key={h.id} className="text-xs text-slate-500">{formatDate(h.created_at)} — {h.outcome.replace('_', ' ')}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="text-sm text-red-600 mb-2">{msg}</p>}

      <button onClick={() => setShowForm((s) => !s)} className="w-full py-2 border-2 border-dashed border-workplace-teal-200 text-workplace-teal-700 text-sm rounded-lg hover:bg-workplace-teal-50">
        {showForm ? 'Cancel' : '+ Apply to a company'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 space-y-2 border border-workplace-teal-100 rounded-lg p-3 bg-workplace-teal-50/30">
          <input required placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          <input placeholder="Company email (optional)" value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} />
          <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Log application</button>
        </form>
      )}
    </Section>
  );
}

// ── Signature (placement phase) ──────────────────────────────────────────────
function SignaturePanel({ internship, onSaved }) {
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
          <p className="font-medium text-emerald-700 text-sm">Agreement signed</p>
          <p className="text-xs text-emerald-600">You've confirmed the placement agreement.</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="Placement agreement">
      <p className="text-sm text-slate-500 mb-3">Please confirm you agree to the terms of this placement.</p>
      <label className="flex items-start gap-2 cursor-pointer mb-3">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
        <span className="text-sm text-slate-700">I confirm the placement details above are correct and I agree to the terms.</span>
      </label>
      <button onClick={handleSign} disabled={!checked} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40">
        Sign agreement
      </button>
    </Section>
  );
}

// ── Reflection (evaluating phase) ────────────────────────────────────────────
function ReflectionPanel({ internship, onSaved }) {
  const studentAssessment = (internship.assessments || []).find((a) => a.assessor_role === 'student');
  const [reflection, setReflection] = useState(studentAssessment?.reflection || '');
  const [competencyNotes, setCompetencyNotes] = useState(studentAssessment?.competency_notes || '');
  const [msg, setMsg] = useState('');

  async function save(submit) {
    setMsg('');
    try {
      await api.post(`/api/internships/${internship.id}/reflection`, { reflection, competency_notes: competencyNotes, submit });
      setMsg(submit ? '✓ Submitted' : '✓ Draft saved');
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
        <Section title="Assessment">
          <div className="grid grid-cols-2 gap-3">
            {[teacherScore, supervisorScore].map((a, i) => a && (
              <div key={i} className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 capitalize">{a.assessor_role}</p>
                <p className="text-2xl font-bold text-emerald-700">{a.score ?? '—'}<span className="text-xs text-slate-400">/{a.max_score}</span></p>
                {a.feedback && <p className="text-xs text-slate-600 mt-1 italic">"{a.feedback}"</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Your reflection">
        {studentAssessment?.submitted_at ? (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Submitted</span>
        ) : (
          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Not submitted</span>
        )}
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">What did you learn from this internship?</label>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Competencies developed</label>
            <textarea value={competencyNotes} onChange={(e) => setCompetencyNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={() => save(false)} className="text-sm border border-slate-300 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50">Save draft</button>
            <button onClick={() => save(true)} disabled={!reflection} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50">
              {studentAssessment?.submitted_at ? 'Update' : 'Submit'}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

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

  const completedAssessments = (internship.assessments || []).filter((a) => a.is_completed && a.assessor_role !== 'student');

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

        {completedAssessments.length > 0 && internship.phase !== 'evaluating' && (
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

        {/* On-site — daily activity logs */}
        {(internship.phase === 'on_site' || internship.phase === 'completed') && (
          <Section title="Daily Activity Logs">
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

            {internship.phase === 'on_site' && (
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
            )}

            {(internship.activityLogs || []).length === 0 && <p className="text-sm text-slate-400">No logs submitted yet.</p>}
            <div className="space-y-2">
              {(internship.activityLogs || []).map((log) => (
                <div key={log.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <p className="font-medium">{log.title || formatDate(log.week_starting)} — {log.hours_logged || 0}h {log.supervisor_ack && <span className="text-emerald-600 text-xs">✓ acknowledged</span>}</p>
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
      </div>
    </div>
  );
}
