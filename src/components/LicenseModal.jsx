import { useState, useEffect, useRef } from "react";
import { TODAY, PLANS } from "../data";

export default function LicenseModal({ initial, onClose, onSave }) {
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
