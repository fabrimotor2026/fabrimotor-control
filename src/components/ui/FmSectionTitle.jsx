export default function FmSectionTitle({
  eyebrow,
  title,
  description,
}) {
  return (
    <div>
      {eyebrow && (
        <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </div>
      )}

      <h2 className="mt-1 text-2xl font-black text-slate-950">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}