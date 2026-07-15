export default function FmEmptyState({
  title,
  description,
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="text-lg font-black text-slate-700">
        {title}
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-500">
        {description}
      </div>
    </div>
  );
}