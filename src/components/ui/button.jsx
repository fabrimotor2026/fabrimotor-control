export function Button({ children, className = "", variant = "default", type = "button", ...props }) {
  const variants = {
    default: "bg-blue-700 text-white hover:bg-blue-800",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    danger: "bg-red-700 text-white hover:bg-red-800",
  };
  return (
    <button type={type} className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}
