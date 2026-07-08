const variants = {
  primary: "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 focus:ring-blue-300",
  secondary: "bg-white text-slate-900 border-slate-300 hover:bg-slate-50 focus:ring-slate-300",
  success: "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 focus:ring-emerald-300",
  warning: "bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-600 focus:ring-amber-300",
  danger: "bg-red-600 text-white border-red-700 hover:bg-red-700 focus:ring-red-300",
  ghost: "bg-transparent text-slate-700 border-transparent hover:bg-slate-100 focus:ring-slate-300",
};

export default function Button({ children, variant = "primary", size = "md", className = "", type = "button", ...props }) {
  const sizes = {
    sm: "min-h-10 px-3 text-sm",
    md: "min-h-12 px-5 text-sm",
    lg: "min-h-14 px-6 text-base",
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border font-black tracking-tight shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
