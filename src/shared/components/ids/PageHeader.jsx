export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {eyebrow && <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600">{eyebrow}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
