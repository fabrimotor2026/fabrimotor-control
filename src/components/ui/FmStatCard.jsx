export default function FmStatCard({
  title,
  value,
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="text-3xl font-black">
        {value}
      </div>

      <div className="mt-1 text-xs font-black uppercase tracking-wide">
        {title}
      </div>
    </div>
  );
}