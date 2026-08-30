/**
 * PageHeader — same structural pattern as ILS-dev's AdminPageShell:
 * sticky white card with a gradient band holding title/subtitle/actions,
 * optional filter bar underneath. Workplace's own teal gradient instead of
 * ILS-dev's role-specific indigo/violet.
 *
 * Usage:
 *   <PageHeader title="Classes" subtitle="..." actions={<button>+ New</button>}>
 *     <FilterBar />
 *   </PageHeader>
 */
export default function PageHeader({ title, eyebrow, subtitle, actions, children }) {
  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-14 z-20 mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-workplace-teal-600 to-workplace-teal-700 text-white flex items-center justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-0.5">{eyebrow}</p>}
          <h1 className="font-semibold text-lg">{title}</h1>
          {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      {children && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          {children}
        </div>
      )}
    </section>
  );
}
