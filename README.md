# XOWN MS365 License Tracker

A professional Microsoft 365 license tracker for Microsoft CSP partners.
Connects to the Partner Center Insights API to automatically sync all client
subscription data — no per-customer GDAP consent required.

Built with **Vite + React 18**, **MSAL Browser v3**, and **Chart.js**.

---

## File Structure

```
license_tracker/
├── index.html              ← Vite entry point
├── vite.config.js          ← Vite dev server config (port 3000)
├── package.json
├── .env                    ← Azure credentials + admin emails
├── assets/
│   ├── xownsolutions.png   ← Navbar logo
│   └── favicon.png
└── src/
    ├── main.jsx            ← React root + routes (/, /admin)
    ├── App.jsx             ← Dashboard: table, metrics, filters, sync
    ├── config.js           ← MSAL / API / threshold settings
    ├── data.js             ← Constants, helpers, localStorage persistence
    ├── api.js              ← MSAL auth + Partner Center Insights sync
    ├── styles.css           ← All styles + dark mode
    ├── components/
    │   ├── Analytics.jsx    ← Doughnut chart + renewal timeline
    │   ├── Drawer.jsx       ← Slide-out license detail panel
    │   ├── ImportModal.jsx  ← CSV import dialog
    │   ├── LicenseModal.jsx ← Add / Edit license form
    │   ├── MetricCard.jsx   ← Summary metric cards
    │   ├── ShortcutsModal.jsx ← Keyboard shortcuts help
    │   ├── SyncProgress.jsx ← Sync progress bar
    │   └── Toast.jsx        ← Toast notifications
    └── pages/
        └── AdminLogin.jsx   ← /admin sign-in page (RBAC)
```

---

## Quick Start

```bash
npm install
npm run dev          # → http://localhost:3000
```

Without Azure credentials configured the app shows sample demo data.

---

## Status Labels

Subscriptions are automatically categorized into four status types based on their renewal date:

- **Active** — Renewal is more than 30 days away
- **Expiring Soon** — Renewal is within the next 30 days
- **Grace Period** — Subscription is 0-30 days overdue (still functional but needs renewal)
- **Disabled** — Subscription is more than 30 days overdue, or marked as disabled/suspended by the Partner Center API

Status is calculated in real-time and displayed with color-coded badges throughout the app.

---

## Data Quality

The tracker automatically maintains data quality during sync:

- **Auto-removal**: Disabled subscriptions older than 10 days are automatically removed from view to keep the dashboard focused on actionable items
- **Deduplication**: When a client has both active and disabled subscriptions for the same plan, only the active subscription is retained
- **Bogus date filtering**: Renewal dates set to year 9999 (sometimes returned by the API for perpetual licenses) are displayed as "—"

---

## Connecting to Microsoft Partner Center

### Step 1 — Register an Azure App (one-time)

1. Go to <https://portal.azure.com>
2. Open **Azure Active Directory → App Registrations → New Registration**
3. Name: `MS365 License Tracker`
4. Supported account types: **Single tenant** (your partner tenant)
5. Redirect URI: **Single-page application (SPA)** → `http://localhost:3000/`
6. Click **Register** and copy the **Application (client) ID** and **Directory (tenant) ID**

> **Important:** Choose **SPA** platform, not "Web". No client secret is needed —
> the app uses MSAL Browser with PKCE for secure token acquisition.

### Step 2 — Add API Permissions

1. Go to **API Permissions → Add a permission**
2. Add **Microsoft Partner Center** → `user_impersonation`
3. Add **Microsoft Graph** → `Organization.Read.All`
4. Click **Grant admin consent** for your organisation

### Step 3 — Configure `.env`

Create a `.env` file in the project root:

```env
VITE_CLIENT_ID=your-application-client-id
VITE_TENANT_ID=your-directory-tenant-id
VITE_ADMIN_EMAILS=admin@yourdomain.com
```

`VITE_ADMIN_EMAILS` is a comma-separated list of emails allowed to add, edit,
delete, and import licenses.

### Step 4 — Add Redirect URIs

In your App Registration → **Authentication**, add all the URIs you will use:

| Environment | Redirect URI |
|---|---|
| Local dev | `http://localhost:3000/` |
| Local admin | `http://localhost:3000/admin` |
| Production | `https://yourdomain.com/` |

### Step 5 — Sign In

1. Run `npm run dev`
2. Navigate to `http://localhost:3000/admin`
3. Sign in with your Microsoft Partner account
4. The tracker syncs all subscriptions via the Partner Center Insights API

---

## Features

| Feature | Description |
|---|---|
| **Insights API sync** | Pulls data from Partner Center Analytics — no per-customer GDAP needed |
| **Auto-refresh** | Re-syncs every 30 min (configurable in `config.js`) |
| **Status tracking** | Active, Expiring Soon (≤ 30 d), Grace Period, Disabled |
| **Auto-cleanup** | Subscriptions disabled > 10 days are automatically removed on sync |
| **Smart dedup** | If a customer has the same plan both active and disabled, the disabled copy is removed |
| **Admin RBAC** | Only emails listed in `VITE_ADMIN_EMAILS` can add / edit / delete / import |
| **Admin login** | Dedicated sign-in page at `/admin` |
| **Dark mode** | Toggle with 🌙 button or press **D** |
| **Search & filter** | Filter by status tab, billing cycle, plan, or free-text search |
| **Analytics** | Doughnut chart for status breakdown + upcoming renewal timeline |
| **Export CSV** | Export all or selected records |
| **Import CSV** | Bulk import from a CSV file |
| **Add / Edit / Delete** | Manually manage records (admin only) |
| **Keyboard shortcuts** | Press **?** to see all shortcuts |

---

## Auto-Refresh Interval

By default the tracker re-syncs every **30 minutes** while the page is open.
Change `AUTO_REFRESH_MINUTES` in `src/config.js` or set to `0` to disable.

---

## Building for Production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

---

## Security Note

`VITE_CLIENT_ID` and `VITE_TENANT_ID` are **not** secret values — they are safe
to include in client-side code. Authentication happens via Microsoft's secure
OAuth 2.0 / PKCE flow; no passwords or tokens are stored in source files.

The `.env` file is listed in `.gitignore` and should **never** be committed.
