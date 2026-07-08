export default function Section({ title, subtitle, children, className = "" }) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
