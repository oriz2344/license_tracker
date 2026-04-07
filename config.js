/**
 * ============================================================
 *  MS365 License Tracker — Configuration
 *  Fill in your Azure App Registration details below.
 * ============================================================
 *
 *  HOW TO GET THESE VALUES (one-time setup):
 *  ------------------------------------------
 *  1. Go to https://portal.azure.com
 *  2. Open "Azure Active Directory" → "App Registrations" → "New Registration"
 *  3. Name: "MS365 License Tracker"
 *  4. Supported account types: "Accounts in any organizational directory"
 *  5. Redirect URI: Web → file:///path/to/this/folder/index.html
 *     (or http://localhost if running on a local server)
 *  6. Click Register → copy CLIENT_ID and TENANT_ID below
 *  7. Go to "Certificates & Secrets" → "New client secret" → copy value below
 *  8. Go to "API Permissions" → Add:
 *       - Microsoft Partner Center → user_impersonation
 *       - Microsoft Graph → Organization.Read.All, Directory.Read.All
 *  9. Grant Admin Consent
 * ============================================================
 */

const CONFIG = {
  // Your Azure App (Client) ID
  CLIENT_ID: "YOUR_CLIENT_ID_HERE",

  // Your Partner tenant ID (your own company's tenant, not a client's)
  TENANT_ID: "YOUR_TENANT_ID_HERE",

  // Redirect URI — must exactly match what you registered in Azure
  // When opening as a local file use: window.location.href
  // When hosted on a server use your actual URL e.g. "https://yourdomain.com/tracker/"
  REDIRECT_URI: window.location.href.split('?')[0].split('#')[0],

  // Partner Center API base URL
  PARTNER_CENTER_API: "https://api.partnercenter.microsoft.com",

  // Microsoft Graph API base URL
  GRAPH_API: "https://graph.microsoft.com/v1.0",

  // OAuth scopes required
  SCOPES: [
    "https://api.partnercenter.microsoft.com/user_impersonation",
    "https://graph.microsoft.com/Organization.Read.All"
  ],

  // How often to auto-refresh data (in minutes). Set to 0 to disable auto-refresh.
  AUTO_REFRESH_MINUTES: 30,

  // Currency formatting
  CURRENCY: "NGN",        // Nigerian Naira
  CURRENCY_SYMBOL: "₦",

  // Status thresholds (days)
  EXPIRING_THRESHOLD_DAYS: 30,
  GRACE_PERIOD_DAYS: -30,   // licenses expired within last 30 days are "grace"

  // Your company name (shown in the nav)
  COMPANY_NAME: " XOWN MS365 License Tracker",
};
