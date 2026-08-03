const variants = {
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  dark: "bg-slate-900 text-white ring-slate-700",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${variants[variant] || variants.neutral} ${className}`}>{children}</span>;
}
