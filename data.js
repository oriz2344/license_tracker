/**
 * ============================================================
 *  MS365 License Tracker — Data Layer
 *  Constants, helpers, sample data, and localStorage persistence.
 * ============================================================
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

const STORAGE_KEY = "ms365_tracker_v3";

const PLANS = [
  "Business Basic", "Business Standard", "Business Premium",
  "Apps for Business", "Apps for Enterprise",
  "E1", "E3", "E5", "F1", "F3", "A3 faculty",
];

const STATUS_LABELS = {
  active:   "Active",
  expiring: "Expiring Soon",
  expired:  "Expired",
  grace:    "Grace Period",
};

// ── Helper Functions ───────────────────────────────────────────────────────────

const daysLeft = (renewal) =>
  Math.round((new Date(renewal) - TODAY) / 86400000);

const getStatus = (days) => {
  if (days < CONFIG.GRACE_PERIOD_DAYS) return "expired";
  if (days < 0)                        return "grace";
  if (days <= CONFIG.EXPIRING_THRESHOLD_DAYS) return "expiring";
  return "active";
};

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const fmtNaira = (n) =>
  CONFIG.CURRENCY_SYMBOL + Number(n).toLocaleString("en-NG");

const initials = (name) =>
  (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function enrichRow(r) {
  const days = daysLeft(r.renewal);
  return { ...r, days, status: getStatus(days) };
}

// ── Fallback Sample Data ───────────────────────────────────────────────────────
// Used when NOT connected to Partner Center (demo / offline mode).

const SAMPLE_DATA = [
  { id:1,  client:"247 Travels",        plan:"Business Basic",    seats:99,  cost:742500,  start:"2025-05-04", renewal:"2026-05-04", billing:"Annual",  email:"", notes:"" },
  { id:2,  client:"Manfieldsolicitors", plan:"Business Standard", seats:9,   cost:135000,  start:"2025-06-02", renewal:"2026-06-02", billing:"Annual",  email:"", notes:"" },
  { id:3,  client:"Manfieldsolicitors", plan:"Business Basic",    seats:9,   cost:67500,   start:"2025-05-04", renewal:"2026-05-04", billing:"Annual",  email:"", notes:"" },
  { id:4,  client:"Babalakin & Co",     plan:"Business Standard", seats:85,  cost:1275000, start:"2025-02-04", renewal:"2026-02-04", billing:"Annual",  email:"", notes:"" },
  { id:5,  client:"Babalakin & Co",     plan:"Business Basic",    seats:25,  cost:187500,  start:"2025-02-04", renewal:"2026-02-04", billing:"Annual",  email:"", notes:"" },
  { id:6,  client:"Babalakin & Co",     plan:"Business Premium",  seats:2,   cost:50000,   start:"2025-02-04", renewal:"2026-02-04", billing:"Annual",  email:"", notes:"" },
  { id:7,  client:"Living Faith Church",plan:"E1",                seats:340, cost:2720000, start:"2025-06-04", renewal:"2026-06-04", billing:"Annual",  email:"", notes:"" },
  { id:8,  client:"Living Faith Church",plan:"Apps for Enterprise",seats:20, cost:400000,  start:"2025-06-04", renewal:"2026-06-04", billing:"Annual",  email:"", notes:"" },
  { id:9,  client:"Chicason Group",     plan:"E3",                seats:120, cost:2160000, start:"2025-03-03", renewal:"2026-03-03", billing:"Annual",  email:"", notes:"" },
  { id:10, client:"Chicason Group",     plan:"Business Basic",    seats:12,  cost:90000,   start:"2025-03-03", renewal:"2026-03-03", billing:"Annual",  email:"", notes:"" },
  { id:11, client:"Covenant University",plan:"A3 faculty",        seats:100, cost:500000,  start:"2025-03-23", renewal:"2026-03-23", billing:"Annual",  email:"", notes:"" },
  { id:12, client:"Dees Travels",       plan:"Business Basic",    seats:19,  cost:142500,  start:"2025-11-04", renewal:"2026-11-04", billing:"Annual",  email:"", notes:"" },
  { id:13, client:"Xown Solutions",     plan:"Business Basic",    seats:31,  cost:232500,  start:"2025-04-24", renewal:"2026-04-24", billing:"Annual",  email:"", notes:"" },
  { id:14, client:"Tices Tech Africa",  plan:"Business Premium",  seats:25,  cost:625000,  start:"2025-03-27", renewal:"2026-03-27", billing:"Annual",  email:"", notes:"" },
  { id:15, client:"Trusted Edge",       plan:"Business Basic",    seats:5,   cost:37500,   start:"2025-05-04", renewal:"2026-05-04", billing:"Annual",  email:"", notes:"" },
  { id:16, client:"Maroto Energy",      plan:"Business Basic",    seats:1,   cost:7500,    start:"2025-04-17", renewal:"2026-04-17", billing:"Annual",  email:"", notes:"" },
  { id:17, client:"Maroto Energy",      plan:"Apps for Business", seats:1,   cost:10000,   start:"2025-03-16", renewal:"2026-03-16", billing:"Annual",  email:"", notes:"" },
  { id:18, client:"Handy Capital",      plan:"Business Basic",    seats:8,   cost:60000,   start:"2025-04-17", renewal:"2026-04-17", billing:"Annual",  email:"", notes:"" },
  { id:19, client:"Moores Energy",      plan:"Business Basic",    seats:6,   cost:45000,   start:"2025-09-04", renewal:"2026-09-04", billing:"Annual",  email:"", notes:"" },
  { id:20, client:"Drayton Africa",     plan:"Business Basic",    seats:2,   cost:15000,   start:"2025-02-06", renewal:"2026-02-06", billing:"Annual",  email:"", notes:"" },
  { id:21, client:"Drayton Africa",     plan:"Apps for Business", seats:1,   cost:10000,   start:"2025-03-22", renewal:"2026-03-22", billing:"Annual",  email:"", notes:"" },
  { id:22, client:"Xtechhub",           plan:"Business Basic",    seats:1,   cost:7500,    start:"2025-04-17", renewal:"2026-04-17", billing:"Annual",  email:"", notes:"" },
  { id:23, client:"Monsoonfood",        plan:"Business Basic",    seats:3,   cost:22500,   start:"2025-04-24", renewal:"2026-04-24", billing:"Annual",  email:"", notes:"" },
  { id:24, client:"The Ark Bearers",    plan:"Business Basic",    seats:1,   cost:7500,    start:"2025-09-04", renewal:"2026-09-04", billing:"Annual",  email:"", notes:"" },
  { id:25, client:"Peaceful Sky",       plan:"Business Basic",    seats:2,   cost:15000,   start:"2025-02-18", renewal:"2026-02-18", billing:"Annual",  email:"", notes:"" },
  { id:26, client:"Altourng",           plan:"Business Basic",    seats:5,   cost:37500,   start:"2025-11-03", renewal:"2026-11-03", billing:"Annual",  email:"", notes:"Expired — follow up" },
  { id:27, client:"Eskay Consult",      plan:"Business Basic",    seats:2,   cost:15000,   start:"2025-03-11", renewal:"2026-03-11", billing:"Annual",  email:"", notes:"Expired — follow up" },
  { id:28, client:"Property Hub",       plan:"Business Basic",    seats:1,   cost:7500,    start:"2025-03-12", renewal:"2026-03-12", billing:"Annual",  email:"", notes:"Expired" },
  { id:29, client:"Contingent Network", plan:"Apps for Business", seats:1,   cost:10000,   start:"2025-03-13", renewal:"2026-03-13", billing:"Annual",  email:"", notes:"Expired" },
  { id:30, client:"3aglobal",           plan:"Business Basic",    seats:8,   cost:60000,   start:"2025-03-22", renewal:"2026-03-22", billing:"Annual",  email:"", notes:"" },
  { id:31, client:"Icore Energy",       plan:"Business Basic",    seats:5,   cost:37500,   start:"2025-03-26", renewal:"2026-03-26", billing:"Annual",  email:"", notes:"" },
  { id:32, client:"Barlanti",           plan:"Business Basic",    seats:2,   cost:15000,   start:"2025-03-22", renewal:"2026-03-22", billing:"Annual",  email:"", notes:"" },
];

// ── localStorage Persistence ───────────────────────────────────────────────────

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return SAMPLE_DATA;
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

// ── CSV Parser (for manual import fallback) ────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map((v) => v.replace(/"/g, "").trim());
    const obj = {};
    headers.forEach((h, j) => (obj[h] = vals[j] || ""));
    return {
      id: Date.now() + i,
      client:  obj["client name"] || obj["client"] || "",
      plan:    obj["ms 365 plan"] || obj["plan"] || "",
      seats:   parseInt(obj["seats"]) || 1,
      cost:    parseInt(obj["monthly cost"] || obj["cost"]) || 0,
      start:   obj["start date"] || obj["start"] || "2026-01-01",
      renewal: obj["renewal date"] || obj["renewal"] || "2026-12-31",
      billing: obj["billing cycle"] || obj["billing"] || "Monthly",
      email:   obj["email"] || "",
      notes:   obj["notes"] || "",
    };
  }).filter((r) => r.client);
}
