import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import PhaseProgress from '../components/PhaseProgress';

const PHASE_ADVANCE_LABEL = { placed: 'Mark as on-site', on_site: 'Move to evaluating' };
const PHASE_ADVANCE_CONFIRM = {
  placed: 'Mark this internship as on-site? The student and coordinator will see it move to the On-site phase.',
  on_site: 'Move this internship to Evaluating? This cannot be undone from here — only completing or reopening it manually can change it back.',
};
const PHASE_DISPLAY_LABEL = { placed: 'Placed', on_site: 'On-site', evaluating: 'Evaluating' };

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-sm font-medium text-slate-600 mb-3">{title}</h2>
      {children}
    </div>
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
      <h1 className="text-lg font-semibold text-slate-800 mt-2">
        {internship.student?.first_name} {internship.student?.last_name}
      </h1>
      <p className="text-sm text-slate-500 mb-4">{internship.status} {internship.start_date && `· ${formatDate(internship.start_date)} – ${formatDate(internship.end_date)}`}</p>

      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <PhaseProgress phase={internship.phase} />
        <div className="flex items-center gap-3">
          {phaseMessage && <span className="text-sm text-emerald-600">{phaseMessage}</span>}
          {PHASE_ADVANCE_LABEL[internship.phase] && (
            <button onClick={advancePhase} className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">
              {PHASE_ADVANCE_LABEL[internship.phase]}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

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
            {(internship.assessments || []).map((a) => (
              <div key={a.id} className="text-sm border border-slate-100 rounded-lg p-2">
                <p className="font-medium capitalize">{a.assessor_role}: {a.score ?? '—'}/{a.max_score}</p>
                <p className="text-slate-600">{a.feedback}</p>
              </div>
            ))}
          </div>
          <form onSubmit={submitAssessment} className="space-y-2">
            <input type="number" placeholder="Score (0-100)" value={assessmentForm.score} onChange={(e) => setAssessmentForm({ ...assessmentForm, score: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <textarea placeholder="Feedback" value={assessmentForm.feedback} onChange={(e) => setAssessmentForm({ ...assessmentForm, feedback: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <button type="submit" className="bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white text-sm rounded-lg px-4 py-2">Submit assessment</button>
          </form>
        </Section>

        <Section title="Placement checklist">
          <div className="space-y-1">
            {(internship.placementChecks || []).length === 0 && <p className="text-sm text-slate-400">No checklist data yet.</p>}
          </div>
          <ChecklistLoader internshipId={id} onToggle={toggleCheck} />
        </Section>

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
