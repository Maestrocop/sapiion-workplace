import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

// Same structural pattern as ILS-dev's PhaseTrack (InternshipDetailPage.jsx):
// numbered circles connected by a line, current step outlined, completed
// steps filled with a checkmark. Workplace's teal instead of ILS-dev's
// sky/indigo mix, and Workplace's own phase keys/labels.
const PHASE_KEYS = ['searching', 'placed', 'on_site', 'evaluating'];

export default function PhaseProgress({ phase }) {
  const { t } = useTranslation();
  const idx = phase === 'completed' ? PHASE_KEYS.length : PHASE_KEYS.indexOf(phase);

  return (
    <div className="flex items-start gap-0 w-full max-w-lg">
      {PHASE_KEYS.map((key, i) => (
        <Fragment key={key}>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i <= idx ? 'bg-white border-white text-workplace-teal-700' :
                           'bg-transparent border-white/40 text-white/40'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${i === idx ? 'text-white font-semibold' : i < idx ? 'text-white/80' : 'text-white/40'}`}>
              {t(`phase.${key}`)}
            </span>
          </div>
          {i < PHASE_KEYS.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 ${i < idx ? 'bg-white' : 'bg-white/30'}`} />}
        </Fragment>
      ))}
    </div>
  );
}
