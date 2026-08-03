export default function Workspace({ children }) {
  return (
    <main className="min-h-screen bg-[#eef3f8] px-3 pb-16 pt-24 transition-all lg:pl-[19rem] lg:pr-6">
      <div className="mx-auto max-w-[1860px] rounded-[2rem] border border-slate-200 bg-white/55 p-4 shadow-inner ring-1 ring-white lg:p-6">
        {children}
      </div>
    </main>
  );
}
