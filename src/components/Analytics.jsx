import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { enrichRow, STATUS_LABELS, fmtDate } from "../data";
import MetricCard from "./MetricCard";

export default function Analytics({ data }) {
  const chartRef1  = useRef(null);
  const chartInst1 = useRef(null);

  const rows        = data.map(enrichRow);
  const statusCounts = { active: 0, expiring: 0, expired: 0, grace: 0 };
  rows.forEach((r) => statusCounts[r.status]++);

  const totalSeats = rows.reduce((a, b) => a + b.seats, 0);

  useEffect(() => {
    if (chartRef1.current) {
      if (chartInst1.current) chartInst1.current.destroy();
      chartInst1.current = new Chart(chartRef1.current, {
        type: "doughnut",
        data: {
          labels: ["Active", "Expiring Soon", "Grace Period", "Disabled"],
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

    return () => { chartInst1.current?.destroy(); };
  }, [data]);

  const timeline = (() => {
    const clientMap = new Map();
    [...rows].sort((a, b) => new Date(a.renewal) - new Date(b.renewal)).forEach((r) => {
      const key = r.client.toLowerCase();
      if (!clientMap.has(key)) {
        const subCount = rows.filter((s) => s.client.toLowerCase() === key).length;
        clientMap.set(key, { ...r, _subCount: subCount });
      }
    });
    return [...clientMap.values()].slice(0, 8);
  })();
  const minDays  = Math.min(...timeline.map((r) => r.days));
  const maxDays  = Math.max(...timeline.map((r) => r.days));
  const range    = maxDays - minDays || 1;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total Licenses" value={rows.length} sub={`${totalSeats} total seats`} icon="📋" variant="brand" />
        <MetricCard label="Total Seats" value={totalSeats} sub={`across ${rows.length} subscriptions`} />
      </div>

      <div className="analytics-grid">
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

        <div className="chart-card">
          <h3>Upcoming Renewals</h3>
          <div className="timeline-wrap">
            <div className="timeline">
              {timeline.map((r) => {
                const w = Math.max(4, ((r.days - minDays) / range) * 100);
                const c = r.status === "expired" || r.status === "grace" ? "#dc2626" : r.status === "expiring" ? "#d97706" : "#52a029";
                return (
                  <div key={r.id} className="tl-item">
                    <span className="tl-name" title={r.client}>
                      {r.client}
                      {r._subCount > 1 && <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>({r._subCount})</span>}
                    </span>
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
