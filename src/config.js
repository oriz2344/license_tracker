export const CONFIG = {
  CLIENT_ID: import.meta.env.VITE_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
  TENANT_ID: import.meta.env.VITE_TENANT_ID || "YOUR_TENANT_ID_HERE",
  REDIRECT_URI: window.location.origin + "/",
  PARTNER_CENTER_API: "https://api.partnercenter.microsoft.com",
  GRAPH_API: "https://graph.microsoft.com/v1.0",
  PARTNER_CENTER_SCOPES: [
    "https://api.partnercenter.microsoft.com/user_impersonation",
  ],
  GRAPH_SCOPES: [
    "https://graph.microsoft.com/Organization.Read.All",
  ],
  LOGIN_SCOPES: ["openid", "profile", "email"],
  AUTO_REFRESH_MINUTES: 30,
  CURRENCY: "NGN",
  CURRENCY_SYMBOL: "₦",
  EXPIRING_THRESHOLD_DAYS: 30,
  GRACE_PERIOD_DAYS: -30,
  COMPANY_NAME: "XOWN MS365 License Tracker",
};

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const IS_CONFIGURED = CONFIG.CLIENT_ID !== "YOUR_CLIENT_ID_HERE";

// Backend API URL for email reminders
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
