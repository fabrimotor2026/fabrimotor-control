export default function Notification({ notification }) {
  if (!notification) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] rounded-2xl px-5 py-4 shadow-2xl text-white font-bold transition-all ${
        notification.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div className="text-sm uppercase opacity-80">FM Control</div>
      <div className="text-base font-black">{notification.message}</div>
    </div>
  );
}