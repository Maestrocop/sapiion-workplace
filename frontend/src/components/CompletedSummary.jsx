import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dates';

// Shown once an internship is completed — same summary for both the
// coordinator's internship detail page and the student's My Internship page.
export default function CompletedSummary({ internship }) {
  const { t } = useTranslation();
  const teacherScore = (internship.assessments || []).find((a) => a.assessor_role === 'teacher' && a.submitted_at);
  const supervisorScore = (internship.assessments || []).find((a) => a.assessor_role === 'supervisor' && a.submitted_at);
  const hasScores = teacherScore || supervisorScore;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm p-6 border border-emerald-200">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🎓</span>
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">{t('completedSummary.title')}</h3>
          <p className="text-xs text-slate-500">{t('completedSummary.finalizedOn', { date: formatDate(internship.completed_at) })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{internship.total_hours != null ? parseFloat(internship.total_hours) : '—'}</div>
          <div className="text-xs text-slate-400">{t('completedSummary.totalHours')}</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-700">{internship.final_score != null ? `${parseFloat(internship.final_score)}%` : '—'}</div>
          <div className="text-xs text-slate-400">{t('completedSummary.finalScore')}</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-sm font-semibold text-slate-800 mt-1">{internship.company_name || '—'}</div>
          <div className="text-xs text-slate-400">{formatDate(internship.start_date)} → {formatDate(internship.end_date)}</div>
        </div>
      </div>

      {hasScores && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[teacherScore, supervisorScore].map((a, i) => a && (
            <div key={i} className="bg-white rounded-lg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400 capitalize">{t(`assessorRoles.${a.assessor_role}`, a.assessor_role)}</span>
                <span className="text-lg font-bold text-slate-800">{parseFloat(a.score)}<span className="text-xs text-slate-400">/{parseFloat(a.max_score)}</span></span>
              </div>
              {a.feedback && <p className="text-xs text-slate-500 mt-1 italic">"{a.feedback}"</p>}
            </div>
          ))}
        </div>
      )}

      {internship.completion_note && (
        <div className="mt-4 text-sm text-slate-600 bg-white rounded-lg p-3 border-l-2 border-emerald-300">
          {internship.completion_note}
        </div>
      )}
    </div>
  );
}
