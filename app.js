/**
 * ============================================================
 *  MS365 License Tracker — Main App
 *
 *  Orchestrates:
 *   - Microsoft Partner Center authentication + sync
 *   - Local data persistence (localStorage fallback)
 *   - All UI state: filters, sorting, modals, toasts
 *   - Auto-refresh on a configurable interval
 * ============================================================
 */

function App() {
  // ── Logo State ───────────────────────────────────────────────────────────────
  const [logo, setLogo] = useState(() => localStorage.getItem("ms365_logo") || null);
  const logoInputRef = useRef();

  function handleLogoUpload(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setLogo(dataUrl);
      localStorage.setItem("ms365_logo", dataUrl);
      toast("Logo updated!", "success");
    };
    reader.readAsDataURL(file);
  }

  function handleLogoRemove() {
    setLogo(null);
    localStorage.removeItem("ms365_logo");
    toast("Logo removed", "warning");
  }

  // ── Auth & Sync State ────────────────────────────────────────────────────────
  const [account,      setAccount]      = useState(() => getCurrentAccount());
  const [isSigningIn,  setIsSigningIn]  = useState(false);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [lastSynced,   setLastSynced]   = useState(null);
  const [syncError,    setSyncError]    = useState(null);
  const [isLiveData,   setIsLiveData]   = useState(false);

  // ── Data State ───────────────────────────────────────────────────────────────
  const [data,   setData]   = useState(() => loadLocalData());
  const [nextId, setNextId] = useState(() => Math.max(...loadLocalData().map((r) => r.id), 0) + 1);

  // ── UI State ─────────────────────────────────────────────────────────────────
  const [view,           setView]           = useState("table");   // "table" | "analytics"
  const [activeTab,      setActiveTab]      = useState("all");
  const [search,         setSearch]         = useState("");
  const [filterBilling,  setFilterBilling]  = useState("");
  const [filterPlan,     setFilterPlan]     = useState("");
  const [sortKey,        setSortKey]        = useState("days");
  const [sortAsc,        setSortAsc]        = useState(true);
  const [selected,       setSelected]       = useState(new Set());
  const [dark,           setDark]           = useState(() => window.matchMedia("(prefers-color-scheme:dark)").matches);
  const [modalMode,      setModalMode]      = useState(null);  // null | "add" | "edit" | "import" | "shortcuts"
  const [editRecord,     setEditRecord]     = useState(null);
  const [drawerRecord,   setDrawerRecord]   = useState(null);
  const [toasts,         setToasts]         = useState([]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [metricFilter,   setMetricFilter]   = useState(null);

  const searchRef = useRef();

  // ── Persist to localStorage ──────────────────────────────────────────────────
  useEffect(() => { saveLocalData(data); }, [data]);

  // ── Dark mode ────────────────────────────────────────────────────────────────
  useEffect(() => { document.documentElement.setAttribute("data-dark", dark); }, [dark]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const toast = useCallback((msg, type = "") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ── Microsoft Sign In ────────────────────────────────────────────────────────
  async function handleSignIn() {
    setIsSigningIn(true);
    setSyncError(null);
    try {
      const acc = await signIn();
      setAccount(acc);
      toast("Signed in as " + acc.username, "success");
      // Immediately trigger a sync after sign-in
      await handleSync(true);
    } catch (err) {
      console.error("Sign-in error:", err);
      setSyncError(err.message);
      toast("Sign-in failed: " + err.message, "error");
    } finally {
      setIsSigningIn(false);
    }
  }

  // ── Microsoft Sign Out ───────────────────────────────────────────────────────
  async function handleSignOut() {
    try {
      await signOut();
      setAccount(null);
      setIsLiveData(false);
      setData(loadLocalData());
      toast("Signed out — showing saved data", "warning");
    } catch (err) {
      toast("Sign-out error: " + err.message, "error");
    }
  }

  // ── Partner Center Sync ──────────────────────────────────────────────────────
  async function handleSync(silent = false) {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({ current: 0, total: 0 });

    try {
      const rows = await syncFromPartnerCenter((current, total) => {
        setSyncProgress({ current, total });
      });

      if (rows.length === 0) {
        toast("No subscriptions found in Partner Center", "warning");
      } else {
        setData(rows);
        setIsLiveData(true);
        setLastSynced(new Date());
        if (!silent) toast(`Synced ${rows.length} subscriptions from Partner Center`, "success");
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncError(err.message);
      toast("Sync failed: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  }

  // ── Auto-refresh ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!account || CONFIG.AUTO_REFRESH_MINUTES <= 0) return;
    const interval = setInterval(() => {
      handleSync(true);
    }, CONFIG.AUTO_REFRESH_MINUTES * 60 * 1000);
    return () => clearInterval(interval);
  }, [account]);

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (modalMode || drawerRecord) return;
      switch (e.key.toUpperCase()) {
        case "N": setModalMode("add"); break;
        case "F": e.preventDefault(); searchRef.current?.focus(); break;
        case "A": setView("analytics"); break;
        case "T": setView("table"); break;
        case "D": setDark((d) => !d); break;
        case "E": exportCSV(); break;
        case "R": if (account) handleSync(); break;
        case "?": setModalMode("shortcuts"); break;
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [modalMode, drawerRecord, data, account]);

  // ── Derived rows ─────────────────────────────────────────────────────────────
  const enriched = useMemo(() => data.map(enrichRow), [data]);
  const counts   = useMemo(() => ({
    all:      enriched.length,
    expiring: enriched.filter((r) => r.status === "expiring").length,
    expired:  enriched.filter((r) => r.status === "expired").length,
    grace:    enriched.filter((r) => r.status === "grace").length,
  }), [enriched]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (activeTab !== "all") rows = rows.filter((r) => r.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.client.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q)
      );
    }
    if (filterBilling) rows = rows.filter((r) => r.billing === filterBilling);
    if (filterPlan)    rows = rows.filter((r) => r.plan === filterPlan);
    return [...rows].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [enriched, activeTab, search, filterBilling, filterPlan, sortKey, sortAsc]);

  const alertCount = counts.expiring + counts.expired + counts.grace;

  // ── Sorting ──────────────────────────────────────────────────────────────────
  function handleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function Th({ k, label, center }) {
    const cls = `sort-col${sortKey === k ? (sortAsc ? " asc" : " desc") : ""}`;
    return <th className={cls} onClick={() => handleSort(k)} style={center ? { textAlign: "center" } : {}}>{label}</th>;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  function handleSave(form) {
    if (editRecord) {
      setData((d) => d.map((r) => r.id === editRecord.id ? { ...form, id: editRecord.id } : r));
      toast("License updated", "success");
    } else {
      const id = nextId; setNextId((n) => n + 1);
      setData((d) => [...d, { ...form, id }]);
      toast("License added", "success");
    }
  }

  function handleDelete(id) {
    setData((d) => d.filter((r) => r.id !== id));
    setSelected((s) => { const ns = new Set(s); ns.delete(id); return ns; });
    toast("License deleted", "warning");
  }

  function handleBulkDelete() {
    if (!window.confirm(`Delete ${selected.size} license(s)?`)) return;
    setData((d) => d.filter((r) => !selected.has(r.id)));
    toast(`Deleted ${selected.size} records`, "warning");
    setSelected(new Set());
  }

  function handleImport(rows) {
    const id0 = nextId;
    setData((d) => [...d, ...rows.map((r, i) => ({ ...r, id: id0 + i }))]);
    setNextId((n) => n + rows.length);
    toast(`Imported ${rows.length} records`, "success");
  }

  // ── Selection ─────────────────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelected((s) => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  // ── Metric filter click ───────────────────────────────────────────────────────
  function handleMetricClick(tab) {
    if (metricFilter === tab) { setMetricFilter(null); setActiveTab("all"); }
    else { setMetricFilter(tab); setActiveTab(tab); }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows    = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    const headers = ["Client", "Plan", "Seats", "Monthly Cost (₦)", "Renewal Date", "Billing", "Status", "Days Left", "Email", "Notes"];
    const lines   = [
      headers.join(","),
      ...rows.map((r) =>
        [r.client, r.plan, r.seats, r.cost, fmtDate(r.renewal), r.billing, STATUS_LABELS[r.status], r.days, r.email || "", r.notes || ""]
          .map((v) => `"${v}"`).join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MS365_Licenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast(`Exported ${rows.length} rows`, "success");
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* SYNC PROGRESS OVERLAY */}
      {isSyncing && <SyncProgress current={syncProgress.current} total={syncProgress.total} />}

      {/* HIDDEN LOGO FILE INPUT */}
      <input
        ref={logoInputRef} type="file" accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleLogoUpload(e.target.files[0])}
      />

      {/* NAV */}
      <nav className="nav">
        <div
          className="nav-logo"
          title={logo ? "Click to change logo · Right-click to remove" : "Click to upload your logo"}
          onClick={() => logoInputRef.current.click()}
          onContextMenu={(e) => { e.preventDefault(); if (logo) handleLogoRemove(); }}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          {logo ? (
            <img src={logo} alt="Logo" className="nav-logo-img" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none">
                <rect width="10" height="10" rx="2" fill="white" opacity=".9" />
                <rect x="13" width="10" height="10" rx="2" fill="white" opacity=".7" />
                <rect y="13" width="10" height="10" rx="2" fill="white" opacity=".7" />
                <rect x="13" y="13" width="10" height="10" rx="2" fill="white" opacity=".9" />
              </svg>
            </>
          )}
          {CONFIG.COMPANY_NAME}
        </div>
        <div className="nav-spacer" />

        {/* Live data indicator */}
        {isLiveData && lastSynced && (
          <div className="nav-pill">
            <span className="live-dot" />
            <span className="nav-date">Live · {lastSynced.toLocaleTimeString()}</span>
          </div>
        )}

        <div className="nav-pill">
          <span className="nav-date">{TODAY.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>

        {/* Auth buttons */}
        {account ? (
          <>
            <button className="nav-btn" onClick={() => handleSync(false)} disabled={isSyncing} title="Refresh from Partner Center (R)">
              {isSyncing ? "⟳ Syncing…" : "⟳ Refresh"}
            </button>
            <button className="nav-btn" onClick={handleSignOut} title="Sign out">
              👤 {account.name || account.username}
            </button>
          </>
        ) : IS_CONFIGURED ? (
          <button className="nav-btn solid" onClick={handleSignIn} disabled={isSigningIn}>
            {isSigningIn ? "Signing in…" : "🔑 Sign in"}
          </button>
        ) : null}

        <button className="nav-icon-btn" title="Toggle dark mode (D)" onClick={() => setDark((d) => !d)}>{dark ? "☀" : "🌙"}</button>
        <button className="nav-icon-btn" title="Keyboard shortcuts (?)" onClick={() => setModalMode("shortcuts")}>⌨</button>
        <button className="nav-btn" onClick={() => setModalMode("import")}>⬆ Import CSV</button>
        <button className="nav-btn" onClick={exportCSV}>⬇ Export</button>
        <button className="nav-btn solid" onClick={() => { setEditRecord(null); setModalMode("add"); }}>+ Add License</button>
      </nav>

      <div className="app-wrap">

        {/* LOGIN BANNER — shown when not signed in */}
        {!account && (
          <LoginBanner
            onSignIn={handleSignIn}
            isLoading={isSigningIn}
            isConfigured={IS_CONFIGURED}
          />
        )}

        {/* SYNC ERROR BANNER */}
        {syncError && (
          <div className="alert-banner" style={{ background: "var(--red-bg)", borderColor: "var(--red-mid)" }}>
            <span className="ab-icon">✕</span>
            <span className="ab-text" style={{ color: "var(--red)" }}>Sync error: {syncError}</span>
            <button className="ab-close" onClick={() => setSyncError(null)}>×</button>
          </div>
        )}

        {/* ALERT BANNER */}
        {!alertDismissed && alertCount > 0 && (
          <div className="alert-banner">
            <span className="ab-icon">⚠</span>
            <span className="ab-text">
              {counts.expired} expired, {counts.grace} in grace period, {counts.expiring} expiring within 30 days — action required.
            </span>
            <button className="ab-close" onClick={() => setAlertDismissed(true)}>×</button>
          </div>
        )}

        {/* METRICS */}
        <div className="metrics">
          <MetricCard
            label="Total Licenses" value={enriched.length}
            sub={`${enriched.reduce((a, b) => a + b.seats, 0)} seats · ${fmtNaira(enriched.reduce((a, b) => a + b.cost, 0))}/mo`}
            icon="📋" variant="brand"
          />
          <MetricCard
            label="Active" value={counts.all - counts.expiring - counts.expired - counts.grace}
            sub="Good standing" icon="✅" variant="ok"
            pct={(counts.all - counts.expiring - counts.expired - counts.grace) / (enriched.length || 1) * 100}
            active={metricFilter === "active"} onClick={() => handleMetricClick("active")}
          />
          <MetricCard
            label="Expiring Soon" value={counts.expiring}
            sub="Renewal within 30 days" icon="⏳" variant="warn"
            active={metricFilter === "expiring"} onClick={() => handleMetricClick("expiring")}
          />
          <MetricCard
            label="Expired / Grace" value={counts.expired + counts.grace}
            sub={`${counts.expired} expired · ${counts.grace} grace`} icon="🔴" variant="danger"
            active={metricFilter === "expired"} onClick={() => handleMetricClick("expired")}
          />
        </div>

        {/* VIEW BAR */}
        <div className="view-bar">
          <div className="view-tabs">
            <button className={`view-tab${view === "table" ? " active" : ""}`} onClick={() => setView("table")}>
              <span>⊟</span> Licenses
            </button>
            <button className={`view-tab${view === "analytics" ? " active" : ""}`} onClick={() => setView("analytics")}>
              <span>📊</span> Analytics
            </button>
          </div>
          <div className="vs" />
          <span className="kbd-hint"><kbd>?</kbd> shortcuts</span>
        </div>

        {view === "analytics" ? (
          <Analytics data={data} />
        ) : (
          <>
            {/* FILTER BAR */}
            <div className="filter-bar">
              <div className="search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  ref={searchRef} className="search-input" placeholder="Search clients, plans…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="filter-select" value={filterBilling} onChange={(e) => setFilterBilling(e.target.value)}>
                <option value="">All billing</option>
                <option>Monthly</option>
                <option>Annual</option>
              </select>
              <select className="filter-select" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
                <option value="">All plans</option>
                {PLANS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <div className="fb-spacer" />
              <span className="row-count-pill">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* STATUS TABS */}
            <div className="status-tabs">
              {[["all","All",counts.all],["active","Active",counts.all-counts.expiring-counts.expired-counts.grace],["expiring","Expiring",counts.expiring],["grace","Grace",counts.grace],["expired","Expired",counts.expired]].map(([k,l,c]) => (
                <button key={k} className={`stab${activeTab === k ? " active" : ""}`} onClick={() => { setActiveTab(k); setMetricFilter(null); }}>
                  {l} <span className="cnt">{c}</span>
                </button>
              ))}
            </div>

            {/* BULK ACTION BAR */}
            {selected.size > 0 && (
              <div className="bulk-bar">
                <span>{selected.size} selected</span>
                <div className="bulk-spacer" />
                <button className="bulk-btn" onClick={exportCSV}>⬇ Export selected</button>
                <button className="bulk-btn danger" onClick={handleBulkDelete}>🗑 Delete selected</button>
                <button className="bulk-btn" onClick={() => setSelected(new Set())}>✕ Clear</button>
              </div>
            )}

            {/* TABLE */}
            <div className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="cb-cell">
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      </th>
                      <Th k="client"  label="Client" />
                      <Th k="plan"    label="Plan" />
                      <Th k="seats"   label="Seats"       center />
                      <Th k="cost"    label="Monthly Cost" />
                      <Th k="renewal" label="Renewal" />
                      <Th k="billing" label="Billing" />
                      <Th k="days"    label="Days Left"   center />
                      <th>Status</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10}>
                        <div className="empty-state">
                          <div className="ei">🔍</div>
                          <div className="et">No licenses found</div>
                          <div className="es">Try adjusting your search or filters</div>
                        </div>
                      </td></tr>
                    ) : filtered.map((r) => {
                      const dc = r.days < 0 ? "neg" : r.days <= 30 ? "warn" : "ok";
                      const dl = r.days < 0 ? `${Math.abs(r.days)}d overdue` : `${r.days}d`;
                      return (
                        <tr key={r.id} className={selected.has(r.id) ? "selected-row" : ""}>
                          <td className="cb-cell"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div className="client-avatar">{initials(r.client)}</div>
                              <div className="client-cell">
                                <div className="name">{r.client}</div>
                                {r.email && <div className="email">{r.email}</div>}
                              </div>
                            </div>
                          </td>
                          <td>{r.plan}</td>
                          <td style={{ textAlign: "center" }}>{r.seats}</td>
                          <td>{fmtNaira(r.cost)}</td>
                          <td>{fmtDate(r.renewal)}</td>
                          <td><span className={`billing-pill ${r.billing.toLowerCase()}`}>{r.billing}</span></td>
                          <td style={{ textAlign: "center" }}><span className={`days-val ${dc}`}>{dl}</span></td>
                          <td><span className={`badge ${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                          <td>
                            <div className="row-actions">
                              <button className="act-btn view-btn" onClick={() => setDrawerRecord(r)}>View</button>
                              <button className="act-btn" onClick={() => { setEditRecord(r); setModalMode("edit"); }}>Edit</button>
                              <button className="act-btn danger" onClick={() => handleDelete(r.id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE FOOTER */}
            {filtered.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", fontSize: 12, color: "var(--subtle)" }}>
                <span>Showing {filtered.length} of {enriched.length} licenses{isLiveData ? " · Live from Partner Center" : " · Demo data"}</span>
                <span>Total: {fmtNaira(filtered.reduce((a, b) => a + b.cost, 0))}/mo · {filtered.reduce((a, b) => a + b.seats, 0)} seats</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {drawerRecord && (
        <Drawer record={drawerRecord} onClose={() => setDrawerRecord(null)}
          onEdit={(r) => { setEditRecord(r); setModalMode("edit"); }} onDelete={handleDelete} />
      )}

      {/* MODALS */}
      {(modalMode === "add" || modalMode === "edit") && (
        <LicenseModal initial={modalMode === "edit" ? editRecord : null}
          onClose={() => { setModalMode(null); setEditRecord(null); }} onSave={handleSave} />
      )}
      {modalMode === "import"    && <ImportModal    onClose={() => setModalMode(null)} onImport={handleImport} />}
      {modalMode === "shortcuts" && <ShortcutsModal onClose={() => setModalMode(null)} />}

      {/* TOASTS */}
      <Toast toasts={toasts} />
    </>
  );
}

// ── Boot ───────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
