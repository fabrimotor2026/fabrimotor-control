export default function KPICard({ icon, label, value, detail }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      {detail && <div className="mt-1 text-xs font-semibold text-slate-500">{detail}</div>}
    </div>
  );
}
