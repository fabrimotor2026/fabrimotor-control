export default function ReadOnlyField({ label, value = "-" }) {
  return (
    <div>
      <div className="text-xs font-black uppercase text-slate-500">
        {label}
      </div>

      <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-black text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}