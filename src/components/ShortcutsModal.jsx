export default function ShortcutsModal({ onClose }) {
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
