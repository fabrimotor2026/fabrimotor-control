export default function CommandItem({ item, active, onMouseEnter, onClick }) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-800 hover:bg-slate-100"
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${active ? "bg-white/15" : "bg-slate-100"}`}>
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black">{item.title}</div>
        <div className={`mt-0.5 truncate text-xs font-semibold ${active ? "text-slate-200" : "text-slate-500"}`}>
          {item.subtitle}
        </div>
      </div>
      <div className={`hidden shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide md:block ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
        {item.meta}
      </div>
    </button>
  );
}
