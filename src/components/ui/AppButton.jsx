const variants = {
  primary:
    "border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700 focus:ring-blue-200",

  secondary:
    "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-200",

  success:
    "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 focus:ring-emerald-200",

  warning:
    "border-amber-500 bg-amber-500 text-white hover:border-amber-600 hover:bg-amber-600 focus:ring-amber-200",

  danger:
    "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 focus:ring-red-200",

  dangerSoft:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-100",

  dark:
    "border-slate-950 bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300",

  ghost:
    "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
};

const sizes = {
  small: "min-h-10 rounded-xl px-3 py-2 text-sm",
  medium: "min-h-12 rounded-2xl px-4 py-3 text-base",
  large: "min-h-16 rounded-3xl px-5 py-4 text-lg",
  touch: "min-h-20 rounded-3xl px-6 py-5 text-lg",
};

export default function AppButton({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 border font-black shadow-sm outline-none transition",
        "focus:ring-4",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] || variants.primary,
        sizes[size] || sizes.medium,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}