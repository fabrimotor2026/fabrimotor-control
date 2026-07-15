export default function FmBadge({
  children,
  color = "slate",
  className = "",
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    yellow: "bg-yellow-100 text-yellow-700",
    slate: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}