export default function FmModal({
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}