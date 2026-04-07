# MS365 License Tracker

A professional Microsoft 365 license tracker that connects directly to your
Microsoft Partner Center to automatically sync all client subscription data.

---

## File Structure

```
ms365-tracker/
├── index.html       ← Main HTML entry point (open this in your browser)
├── styles.css       ← All visual styles & dark mode
├── config.js        ← ⚙️  YOUR SETTINGS GO HERE (credentials, thresholds)
├── data.js          ← Constants, helpers, sample/fallback data
├── api.js           ← Microsoft MSAL auth + Partner Center API calls
├── components.js    ← All React UI components
├── app.js           ← Main App logic, state management, data sync
└── README.md        ← This file
```

---

## Quick Start (Demo Mode)

Just open `index.html` in any modern browser — no setup needed.
It will show your existing 32 client records as demo data.

---

## Connecting to Microsoft Partner Center (Live Data)

### Step 1 — Register an Azure App (one-time, ~10 minutes)

1. Go to https://portal.azure.com
2. Open **Azure Active Directory → App Registrations → New Registration**
3. Name: `MS365 License Tracker`
4. Supported account types: **Accounts in any organizational directory**
5. Redirect URI: **Web** → enter the full path to your `index.html`
   - Local file example: `file:///C:/Users/YourName/ms365-tracker/index.html`
   - Hosted example: `https://yourdomain.com/tracker/`
6. Click **Register**
7. Copy your **Application (client) ID** and **Directory (tenant) ID**

### Step 2 — Create a Client Secret

1. In your app registration, go to **Certificates & Secrets**
2. Click **New client secret**, set an expiry, click **Add**
3. Copy the secret **Value** immediately (it won't be shown again)

### Step 3 — Add API Permissions

1. Go to **API Permissions → Add a permission**
2. Add **Microsoft Partner Center** → `user_impersonation`
3. Add **Microsoft Graph** → `Organization.Read.All`
4. Click **Grant admin consent** for your organisation

### Step 4 — Edit config.js

Open `config.js` and fill in:

```javascript
CLIENT_ID: "paste-your-client-id-here",
TENANT_ID: "paste-your-tenant-id-here",
```

### Step 5 — Open and Sign In

1. Open `index.html` in your browser
2. Click the **🔑 Sign in** button in the top nav
3. Log in with your Microsoft Partner account
4. The tracker will automatically fetch all your clients and their subscriptions

---

## Features

| Feature | Description |
|---|---|
| **Auto-sync** | Pulls live data from Partner Center on sign-in + every 30 mins |
| **Status tracking** | Active, Expiring Soon (≤30d), Grace Period, Expired |
| **Dark mode** | Toggle with 🌙 button or press **D** |
| **Search & filter** | Filter by status, billing type, plan |
| **Analytics** | Charts for status breakdown, revenue by plan/billing |
| **Export CSV** | Export all or selected records |
| **Import CSV** | Bulk import from a CSV file |
| **Add/Edit/Delete** | Manually manage records |
| **Keyboard shortcuts** | Press **?** to see all shortcuts |

---

## Notes on Costs

The Partner Center API does **not** expose your reseller cost/price for each
subscription. After syncing, you may need to edit individual records to add
the correct `Monthly Cost (₦)` value. Costs you enter are saved locally in
your browser's localStorage and are not overwritten during future syncs.

---

## Auto-Refresh Interval

By default the tracker re-syncs every 30 minutes while the page is open.
To change this, edit `AUTO_REFRESH_MINUTES` in `config.js`.
Set to `0` to disable auto-refresh.

---

## Security Note

Your `CLIENT_ID` and `TENANT_ID` are embedded in `config.js`. These are
not secret values — they are safe to include in a client-side file. The
actual authentication happens via Microsoft's secure OAuth2 popup, and no
passwords or tokens are stored in the file.

Keep your **Client Secret** private and never paste it into the HTML/JS files.
The MSAL library handles token acquisition securely without needing the secret
in browser code.
