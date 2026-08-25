const PHASES = [
  { key: 'searching', label: 'Searching' },
  { key: 'placed', label: 'Placed' },
  { key: 'on_site', label: 'On-site' },
  { key: 'evaluating', label: 'Evaluating' },
];

export default function PhaseProgress({ phase }) {
  const currentIndex = phase === 'completed' ? PHASES.length : PHASES.findIndex((p) => p.key === phase);

  return (
    <div className="flex gap-4">
      {PHASES.map((p, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={p.key} className="flex items-center gap-1.5 text-sm">
            <span
              className={
                done ? 'text-emerald-600' :
                active ? 'text-workplace-teal-700 font-medium' :
                'text-slate-400'
              }
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={active ? 'text-workplace-teal-700 font-medium' : done ? 'text-slate-600' : 'text-slate-400'}>
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
