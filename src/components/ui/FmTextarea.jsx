export default function FmTextarea({
  className = "",
  rows = 3,
  ...props
}) {
  return (
    <textarea
      rows={rows}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
      {...props}
    />
  );
}