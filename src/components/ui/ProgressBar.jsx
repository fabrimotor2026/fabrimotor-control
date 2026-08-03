const tones = {
  primary: "bg-blue-600",
  success: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-red-600",
};

export default function ProgressBar({
  value = 0,
  tone = "primary",
  height = "medium",
  showValue = false,
  className = "",
}) {
  const safeValue = Math.max(
    0,
    Math.min(Number(value) || 0, 100)
  );

  const heights = {
    small: "h-2",
    medium: "h-4",
    large: "h-6",
  };

  return (
    <div className={className}>
      <div
        className={[
          "overflow-hidden rounded-full bg-slate-200 shadow-inner",
          heights[height] || heights.medium,
        ].join(" ")}
      >
        <div
          className={[
            "h-full rounded-full transition-all duration-700 ease-out",
            tones[tone] || tones.primary,
          ].join(" ")}
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>

      {showValue && (
        <div className="mt-2 text-right text-sm font-black text-slate-600">
          {Math.round(safeValue)}%
        </div>
      )}
    </div>
  );
}