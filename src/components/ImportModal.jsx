import { useState, useRef } from "react";
import { parseCSV } from "../data";

export default function ImportModal({ onClose, onImport }) {
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
