const variants = {
  online: "bg-emerald-500",
  warning: "bg-amber-500",
  offline: "bg-red-500",
  neutral: "bg-slate-400",
};

export default function StatusIndicator({ status = "neutral", label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${variants[status] || variants.neutral}`} />
      {label}
    </span>
  );
}
