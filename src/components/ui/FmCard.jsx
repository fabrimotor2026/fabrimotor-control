export default function FmCard({
  children,
  className = "",
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}