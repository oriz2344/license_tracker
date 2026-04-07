export default function SyncProgress({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="sync-overlay">
      <div className="sync-card">
        <div className="sync-spinner" />
        <div className="sync-label">{label || "Syncing from Partner Center…"}</div>
        <div className="sync-sub">{current} of {total} tenants</div>
        <div className="sync-track">
          <div className="sync-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="sync-pct">{pct}%</div>
      </div>
    </div>
  );
}
