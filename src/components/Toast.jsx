export default function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || ""}`}>
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "warning" ? "⚠" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
