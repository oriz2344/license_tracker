/**
 * ============================================================
 *  MS365 License Tracker — React Components
 *
 *  Contains:
 *   - Toast notification system
 *   - MetricCard
 *   - Drawer (detail side panel)
 *   - Analytics view (charts)
 *   - LicenseModal (add / edit)
 *   - ImportModal (CSV import)
 *   - ShortcutsModal
 *   - LoginBanner (Microsoft sign-in prompt)
 *   - SyncProgress overlay
 * ============================================================
 */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
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

// ── MetricCard ─────────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, variant = "", pct = null, onClick, active }) {
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

// ── LoginBanner ────────────────────────────────────────────────────────────────

function LoginBanner({ onSignIn, isLoading, isConfigured }) {
  return (
    <div className="login-banner">
      <div className="lb-icon">🔗</div>
      <div className="lb-content">
        <div className="lb-title">
          {isConfigured ? "Connect to Microsoft Partner Center" : "Partner Center not configured"}
        </div>
        <div className="lb-sub">
          {isConfigured
            ? "Sign in with your Microsoft partner account to automatically load all client license data."
            : "Add your CLIENT_ID and TENANT_ID in config.js to enable live sync. Showing demo data for now."}
        </div>
      </div>
      {isConfigured && (
        <button className="btn primary" onClick={onSignIn} disabled={isLoading}>
          {isLoading ? "Signing in…" : "🔑 Sign in with Microsoft"}
        </button>
      )}
    </div>
  );
}

// ── SyncProgress ───────────────────────────────────────────────────────────────

function SyncProgress({ current, total, label }) {
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

// ── Drawer ─────────────────────────────────────────────────────────────────────

function Drawer({ record, onClose, onEdit, onDelete }) {
  const r = enrichRow(record);
  const startDate  = new Date(r.start);
  const renewDate  = new Date(r.renewal);
  const totalDays  = Math.round((renewDate - startDate) / 86400000);
  const elapsed    = Math.round((TODAY - startDate) / 86400000);
  const pct        = Math.min(100, Math.max(0, (elapsed / (totalDays || 1)) * 100));
  const barColor   =
    r.status === "expired" || r.status === "grace"
      ? "#dc2626"
      : r.status === "expiring"
      ? "#d97706"
      : "#ff6701";

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  return (
    <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer">
        <div className="drawer-head">
          <div className="drawer-avatar">{initials(r.client)}</div>
          <div className="drawer-head-info">
            <h2>{r.client}</h2>
            <p>{r.plan}</p>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <div style={{ marginBottom: 20 }}>
            <span className={`badge ${r.status}`}>{STATUS_LABELS[r.status]}</span>
            <span style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>
              {r.days < 0 ? `${Math.abs(r.days)} days overdue` : `${r.days} days remaining`}
            </span>
          </div>

          <div className="renewal-progress" style={{ marginBottom: 20 }}>
            <div className="rp-head">
              <span>License period</span>
              <span>{Math.round(pct)}% elapsed</span>
            </div>
            <div className="rp-track">
              <div className="rp-fill" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--subtle)" }}>
              <span>Start: {fmtDate(r.start)}</span>
              <span>Renewal: {fmtDate(r.renewal)}</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item"><div className="di-label">Seats</div><div className="di-val">{r.seats}</div></div>
            <div className="detail-item"><div className="di-label">Monthly Cost</div><div className="di-val">{fmtNaira(r.cost)}</div></div>
            <div className="detail-item"><div className="di-label">Billing</div><div className="di-val">{r.billing}</div></div>
            <div className="detail-item"><div className="di-label">Annual Value</div><div className="di-val">{fmtNaira(r.billing === "Annual" ? r.cost : r.cost * 12)}</div></div>
            <div className="detail-item"><div className="di-label">Email</div><div className="di-val" style={{ fontSize: 13 }}>{r.email || <span style={{ color: "var(--subtle)" }}>—</span>}</div></div>
            <div className="detail-item"><div className="di-label">Cost per Seat</div><div className="di-val">{fmtNaira(Math.round(r.cost / (r.seats || 1)))}</div></div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="di-label" style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
            <div className="notes-box">{r.notes || <span style={{ color: "var(--subtle)" }}>No notes.</span>}</div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn danger sm" onClick={() => { onDelete(r.id); onClose(); }}>Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={onClose}>Close</button>
          <button className="btn primary sm" onClick={() => { onEdit(r); onClose(); }}>Edit</button>
        </div>
      </div>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────────

function Analytics({ data }) {
  const chartRef1  = useRef(null);
  const chartRef2  = useRef(null);
  const chartInst1 = useRef(null);
  const chartInst2 = useRef(null);

  const rows        = data.map(enrichRow);
  const statusCounts = { active: 0, expiring: 0, expired: 0, grace: 0 };
  rows.forEach((r) => statusCounts[r.status]++);

  const planRevenue = {};
  rows.forEach((r) => { planRevenue[r.plan] = (planRevenue[r.plan] || 0) + r.cost; });
  const topPlans = Object.entries(planRevenue).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const totalRev   = rows.reduce((a, b) => a + b.cost, 0);
  const annualRev  = rows.filter((r) => r.billing === "Annual").reduce((a, b) => a + b.cost, 0);
  const monthlyRev = rows.filter((r) => r.billing === "Monthly").reduce((a, b) => a + b.cost, 0);
  const totalSeats = rows.reduce((a, b) => a + b.seats, 0);

  useEffect(() => {
    if (chartRef1.current) {
      if (chartInst1.current) chartInst1.current.destroy();
      chartInst1.current = new Chart(chartRef1.current, {
        type: "doughnut",
        data: {
          labels: ["Active", "Expiring Soon", "Grace Period", "Expired"],
          datasets: [{
            data: [statusCounts.active, statusCounts.expiring, statusCounts.grace, statusCounts.expired],
            backgroundColor: ["#52a029", "#d97706", "#3b82f6", "#dc2626"],
            borderWidth: 0, hoverOffset: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}` } } },
          cutout: "65%",
        },
      });
    }

    if (chartRef2.current) {
      if (chartInst2.current) chartInst2.current.destroy();
      const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
      chartInst2.current = new Chart(chartRef2.current, {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            { label: "Annual",  data: Array(7).fill(annualRev),  backgroundColor: "#ff6701", borderRadius: 5 },
            { label: "Monthly", data: Array(7).fill(monthlyRev), backgroundColor: "#ffe0c5", borderRadius: 5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { stacked: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 11 }, callback: (v) => "₦" + Math.round(v / 1000) + "k" } },
          },
        },
      });
    }

    return () => { chartInst1.current?.destroy(); chartInst2.current?.destroy(); };
  }, [data]);

  const timeline = [...rows].sort((a, b) => new Date(a.renewal) - new Date(b.renewal)).slice(0, 8);
  const minDays  = Math.min(...timeline.map((r) => r.days));
  const maxDays  = Math.max(...timeline.map((r) => r.days));
  const range    = maxDays - minDays || 1;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total Revenue"      value={fmtNaira(totalRev)}   sub="per month"  icon="💰" variant="brand" />
        <MetricCard label="Annual Contracts"   value={fmtNaira(annualRev)}  sub="monthly value" />
        <MetricCard label="Monthly Contracts"  value={fmtNaira(monthlyRev)} sub="per month" />
        <MetricCard label="Cost per Seat"      value={fmtNaira(totalSeats ? Math.round(totalRev / totalSeats) : 0)} sub={`${totalSeats} total seats`} />
      </div>

      <div className="analytics-grid">
        {/* Donut chart */}
        <div className="chart-card">
          <h3>License Status</h3>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div className="chart-wrap" style={{ height: 180, flex: "0 0 180px" }}>
              <canvas ref={chartRef1} />
            </div>
            <div style={{ flex: 1 }}>
              {[["active","#52a029"],["expiring","#d97706"],["grace","#3b82f6"],["expired","#dc2626"]].map(([s, c]) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 12.5, color: "var(--muted)", flex: 1 }}>{STATUS_LABELS[s]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{statusCounts[s]}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{rows.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="chart-card">
          <h3>Revenue by Billing</h3>
          <div className="chart-wrap" style={{ height: 200 }}>
            <canvas ref={chartRef2} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[["Annual","#ff6701"],["Monthly","#ffe0c5"]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block", border: "1px solid var(--border)" }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by plan */}
        <div className="chart-card">
          <h3>Revenue by Plan</h3>
          <div className="progress-list">
            {topPlans.map(([plan, rev], i) => (
              <div key={plan} className="progress-item">
                <div className="pi-head">
                  <span className="pi-label">{plan}</span>
                  <span className="pi-val">{fmtNaira(rev)}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(rev / topPlans[0][1]) * 100}%`, opacity: 1 - i * 0.1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Renewal timeline */}
        <div className="chart-card">
          <h3>Upcoming Renewals</h3>
          <div className="timeline-wrap">
            <div className="timeline">
              {timeline.map((r) => {
                const w = Math.max(4, ((r.days - minDays) / range) * 100);
                const c = r.status === "expired" || r.status === "grace" ? "#dc2626" : r.status === "expiring" ? "#d97706" : "#52a029";
                return (
                  <div key={r.id} className="tl-item">
                    <span className="tl-name" title={r.client}>{r.client}</span>
                    <div className="tl-bar-wrap">
                      <div className="tl-bar" style={{ width: `${w}%`, background: c }} />
                    </div>
                    <span className="tl-date">{fmtDate(r.renewal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Import Modal ───────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImport }) {
  const [drag,    setDrag]    = useState(false);
  const [preview, setPreview] = useState(null);
  const [err,     setErr]     = useState("");
  const fileRef = useRef();

  function handleFile(file) {
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try { setPreview(parseCSV(e.target.result)); }
      catch (ex) { setErr(ex.message); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div className="modal-accent" />
          <h2>Import from CSV</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!preview ? (
          <>
            <div
              className={`import-zone ${drag ? "dragover" : ""}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <div className="iz-icon">📂</div>
              <div className="iz-text">Drop your CSV here or click to browse</div>
              <div className="iz-sub">Columns: Client Name, MS 365 Plan, Seats, Monthly Cost, Renewal Date, Billing Cycle, Email, Notes</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
            {err && <div className="form-err" style={{ marginTop: 10 }}>⚠ {err}</div>}
            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: "var(--r)", fontSize: 12, color: "var(--muted)", border: "1px solid var(--border)" }}>
              <strong style={{ display: "block", marginBottom: 4, color: "var(--text)" }}>Expected CSV format</strong>
              Client Name, MS 365 Plan, Seats, Monthly Cost, Renewal Date, Billing Cycle, Email, Notes
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--green-bg)", borderRadius: "var(--r)", fontSize: 13, color: "var(--green)", fontWeight: 500 }}>
              ✓ Found {preview.length} records ready to import
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--r)", fontSize: 12 }}>
              {preview.map((r, i) => (
                <div key={i} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)" }}>
                  <span style={{ fontWeight: 500 }}>{r.client}</span>
                  <span style={{ color: "var(--muted)" }}>{r.plan} · {r.seats} seats</span>
                  <span style={{ color: "var(--muted)" }}>{r.renewal}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          {preview && <button className="btn primary" onClick={() => { onImport(preview); onClose(); }}>Import {preview.length} records</button>}
        </div>
      </div>
    </div>
  );
}

// ── Shortcuts Modal ────────────────────────────────────────────────────────────

function ShortcutsModal({ onClose }) {
  const shortcuts = [
    ["N", "Add new license"], ["F", "Focus search"], ["A", "Analytics view"], ["T", "Table view"],
    ["D", "Toggle dark mode"], ["E", "Export CSV"], ["Esc", "Close modal/drawer"], ["?", "Show shortcuts"],
  ];
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div className="modal-accent" />
          <h2>Keyboard Shortcuts</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="shortcuts-list">
          {shortcuts.map(([k, label]) => (
            <div key={k} className="shortcut-item">
              <kbd>{k}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ── License Modal (Add / Edit) ─────────────────────────────────────────────────

function LicenseModal({ initial, onClose, onSave }) {
  const today = TODAY.toISOString().slice(0, 10);
  const [form, setForm] = useState(
    initial || { client: "", plan: "", seats: "", cost: "", start: today, renewal: "", billing: "Monthly", email: "", notes: "" }
  );
  const [err, setErr] = useState("");
  const firstRef = useRef();

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && e.metaKey) save(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [form]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function save() {
    if (!form.client.trim() || !form.plan || !form.seats || !form.cost || !form.renewal) {
      setErr("Please fill in all required fields."); return;
    }
    if (isNaN(parseInt(form.seats)) || parseInt(form.seats) < 1) { setErr("Seats must be a positive number."); return; }
    if (isNaN(parseInt(form.cost))  || parseInt(form.cost)  < 0) { setErr("Cost must be a valid number."); return; }
    onSave({ ...form, seats: parseInt(form.seats), cost: parseInt(form.cost) });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-accent" />
          <h2>{initial ? "Edit License" : "Add New License"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-section-label">Client Info</div>
        <div className="form-row">
          <div className="form-group">
            <label>Client Name *</label>
            <input ref={firstRef} value={form.client} onChange={set("client")} placeholder="e.g. Patelo Travels" />
          </div>
          <div className="form-group">
            <label>Contact Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="admin@client.com" />
          </div>
        </div>

        <div className="form-section-label">License Details</div>
        <div className="form-row">
          <div className="form-group">
            <label>MS 365 Plan *</label>
            <select value={form.plan} onChange={set("plan")}>
              <option value="">Select plan…</option>
              {PLANS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Billing Cycle</label>
            <select value={form.billing} onChange={set("billing")}>
              <option>Monthly</option>
              <option>Annual</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Seats *</label>
            <input type="number" min="1" value={form.seats} onChange={set("seats")} placeholder="5" />
          </div>
          <div className="form-group">
            <label>Monthly Cost (₦) *</label>
            <input type="number" min="0" value={form.cost} onChange={set("cost")} placeholder="15000" />
          </div>
        </div>

        <div className="form-section-label">Dates</div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start} onChange={set("start")} />
          </div>
          <div className="form-group">
            <label>Renewal Date *</label>
            <input type="date" value={form.renewal} onChange={set("renewal")} />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={set("notes")} placeholder="Optional notes about this license…" style={{ height: 68 }} />
        </div>

        {err && <div className="form-err">⚠ {err}</div>}

        <div className="modal-footer">
          <span style={{ fontSize: 12, color: "var(--subtle)", marginRight: "auto" }}>⌘↵ to save</span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{initial ? "Save Changes" : "Add License"}</button>
        </div>
      </div>
    </div>
  );
}
