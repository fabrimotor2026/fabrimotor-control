export default function CpkModal({ children, onClose }) {
  return <BasicModal title="Gráfico CPK 30/40" onClose={onClose}>{children || <p>Gráfico CPK pendiente de conectar.</p>}</BasicModal>;
}

function BasicModal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,.65)" }}>
      <div className="max-h-[92vh] w-[min(1100px,96vw)] overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose}>Cerrar</button></div>
        {children}
      </div>
    </div>
  );
}
