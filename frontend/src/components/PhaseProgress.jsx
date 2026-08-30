import { Fragment } from 'react';

// Same structural pattern as ILS-dev's PhaseTrack (InternshipDetailPage.jsx):
// numbered circles connected by a line, current step outlined, completed
// steps filled with a checkmark. Workplace's teal instead of ILS-dev's
// sky/indigo mix, and Workplace's own phase keys/labels.
const PHASES = [
  { key: 'searching', label: 'Searching' },
  { key: 'placed', label: 'Placed' },
  { key: 'on_site', label: 'On-site' },
  { key: 'evaluating', label: 'Evaluating' },
];

export default function PhaseProgress({ phase }) {
  const idx = phase === 'completed' ? PHASES.length : PHASES.findIndex((p) => p.key === phase);

  return (
    <div className="flex items-start gap-0 w-full max-w-lg">
      {PHASES.map((p, i) => (
        <Fragment key={p.key}>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i <= idx ? 'bg-white border-white text-workplace-teal-700' :
                           'bg-transparent border-white/40 text-white/40'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${i === idx ? 'text-white font-semibold' : i < idx ? 'text-white/80' : 'text-white/40'}`}>
              {p.label}
            </span>
          </div>
          {i < PHASES.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 ${i < idx ? 'bg-white' : 'bg-white/30'}`} />}
        </Fragment>
      ))}
    </div>
  );
}
