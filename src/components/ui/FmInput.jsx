export default function FmInput({
  className = "",
  ...props
}) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
      {...props}
    />
  );
}