import { useEffect, useMemo } from "react";
import { enrichRow, TODAY, STATUS_LABELS, initials, fmtDate, fmtNaira } from "../data";

function SubProgress({ r }) {
  const startDate = new Date(r.start);
  const renewDate = new Date(r.renewal);
  const totalDays = Math.round((renewDate - startDate) / 86400000);
  const elapsed   = Math.round((TODAY - startDate) / 86400000);
  const pct       = Math.min(100, Math.max(0, (elapsed / (totalDays || 1)) * 100));
  const barColor  =
    r.status === "disabled" || r.status === "grace" ? "#dc2626"
      : r.status === "expiring" ? "#d97706" : "#ff6701";
  return (
    <div className="rp-track" style={{ height: 6, marginTop: 6 }}>
      <div className="rp-fill" style={{ width: `${pct}%`, background: barColor }} />
    </div>
  );
}

export default function Drawer({ record, allData, onClose, onEdit, onDelete, isAdmin }) {
  const clientName = record.client;

  // All subscriptions for this client
  const subs = useMemo(() => {
    if (!allData) return [enrichRow(record)];
    return allData
      .filter((r) => r.client.toLowerCase() === clientName.toLowerCase())
      .map(enrichRow)
      .sort((a, b) => b.cost - a.cost);
  }, [allData, clientName]);

  // Client-level aggregates
  const totalSeats = subs.reduce((a, b) => a + b.seats, 0);
  const totalCost  = subs.reduce((a, b) => a + b.cost, 0);
  const email      = subs.find((s) => s.email)?.email || "";

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  return (
    <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer">
        {/* Client header */}
        <div className="drawer-head">
          <div className="drawer-avatar">{initials(clientName)}</div>
          <div className="drawer-head-info">
            <h2>{clientName}</h2>
            <p>{subs.length} subscription{subs.length !== 1 ? "s" : ""}</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Client summary */}
          <div className="drawer-client-summary">
            <div className="detail-item"><div className="di-label">Total Seats</div><div className="di-val">{totalSeats}</div></div>
            <div className="detail-item"><div className="di-label">Monthly Cost</div><div className="di-val">{fmtNaira(totalCost)}</div></div>
            <div className="detail-item"><div className="di-label">Annual Value</div><div className="di-val">{fmtNaira(totalCost * 12)}</div></div>
            <div className="detail-item"><div className="di-label">Email</div><div className="di-val" style={{ fontSize: 13 }}>{email || <span style={{ color: "var(--subtle)" }}>—</span>}</div></div>
          </div>

          {/* Subscriptions list */}
          <div className="di-label" style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 10 }}>
            Subscriptions
          </div>
          <div className="drawer-sub-list">
            {subs.map((s) => {
              const isActive = s.id === record.id;
              return (
                <div key={s.id} className={`drawer-sub-item${isActive ? " drawer-sub-active" : ""}`}>
                  <div className="drawer-sub-header">
                    <span className="drawer-sub-plan">{s.plan}</span>
                    <span className={`badge ${s.status}`} style={{ fontSize: 10, padding: "2px 7px" }}>{STATUS_LABELS[s.status]}</span>
                  </div>
                  <div className="drawer-sub-details">
                    <span>{s.seats} seats</span>
                    <span>{fmtNaira(s.cost)}/mo</span>
                    <span>{s.billing}</span>
                    <span className={`days-val ${s.days < 0 ? "neg" : s.days <= 30 ? "warn" : "ok"}`} style={{ fontSize: 11 }}>
                      {s.days < 0 ? `${Math.abs(s.days)}d overdue` : `${s.days}d left`}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--subtle)", marginTop: 4 }}>
                    <span>Start: {fmtDate(s.start)}</span>
                    <span>Renewal: {fmtDate(s.renewal)}</span>
                  </div>
                  <SubProgress r={s} />
                  {s.notes && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>{s.notes}</div>
                  )}
                  {isAdmin && (
                    <div className="drawer-sub-actions">
                      <button className="act-btn" onClick={() => { onEdit(s); onClose(); }}>Edit</button>
                      <button className="act-btn danger" onClick={() => { onDelete(s.id); if (subs.length <= 1) onClose(); }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="drawer-footer">
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
