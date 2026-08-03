export default function Panel({ children, title, subtitle, action, className = "" }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            {title && <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
