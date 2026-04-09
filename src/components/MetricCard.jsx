export default function MetricCard({ label, value, sub, icon, variant = "", pct = null, onClick, active }) {
  return (
    <div
      className={`metric-card ${variant} ${active ? "selected" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="mc-label">{label}</div>
      <div className="mc-val">{value}</div>
      {sub  && <div className="mc-sub">{sub}</div>}
      {icon && <div className="mc-icon">{icon}</div>}
      {pct !== null && <div className="mc-bar" style={{ width: `${Math.min(100, pct)}%` }} />}
    </div>
  );
}
