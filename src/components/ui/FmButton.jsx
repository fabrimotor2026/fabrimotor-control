export default function FmButton({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    dark:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
  };

  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}