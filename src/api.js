import { PublicClientApplication } from "@azure/msal-browser";
import { CONFIG } from "./config.js";
import { IS_CONFIGURED } from "./config.js";
import { daysLeft, getStatus } from "./data.js";

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

const msalConfig = {
  auth: {
    clientId:    CONFIG.CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${CONFIG.TENANT_ID}`,
    redirectUri: CONFIG.REDIRECT_URI,
  },
  cache: {
    cacheLocation:       "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const msalInstance = IS_CONFIGURED ? new PublicClientApplication(msalConfig) : null;

// MSAL v3 requires explicit initialization
const msalReady = msalInstance ? msalInstance.initialize() : Promise.resolve();

async function ensureInitialized() {
  await msalReady;
}

export { ensureInitialized };

async function getToken(scopes) {
  if (!msalInstance) throw new Error("MSAL not configured.");
  await ensureInitialized();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error("No signed-in account.");
  try {
    const result = await msalInstance.acquireTokenSilent({ scopes, account: accounts[0] });
    return result.accessToken;
  } catch (err) {
    const result = await msalInstance.acquireTokenPopup({ scopes });
    return result.accessToken;
  }
}

export async function signIn() {
  if (!msalInstance) throw new Error("Configure CLIENT_ID and TENANT_ID in .env first.");
  await ensureInitialized();
  const result = await msalInstance.loginPopup({ scopes: CONFIG.LOGIN_SCOPES });
  return result.account;
}

export async function signOut() {
  if (!msalInstance) return;
  await ensureInitialized();
  const account = msalInstance.getAllAccounts()[0];
  if (account) {
    await msalInstance.logoutPopup({ account });
  }
}

export function getCurrentAccount() {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

async function fetchAllCustomers(token) {
  let customers = [];
  let url = `${CONFIG.PARTNER_CENTER_API}/v1/customers?size=500`;
  while (url) {
    const res = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        "application/json",
        "MS-PartnerCenter-Application": CONFIG.COMPANY_NAME,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Partner Center customers fetch failed (${res.status}): ${err}`);
    }
    const json = await res.json();
    customers = customers.concat(json.items || []);
    url = json.links?.next?.uri ? `${CONFIG.PARTNER_CENTER_API}${json.links.next.uri}` : null;
  }
  return customers;
}

async function fetchCustomerSubscriptions(token, customerId) {
  const res = await fetchWithTimeout(
    `${CONFIG.PARTNER_CENTER_API}/v1/customers/${customerId}/subscriptions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        "application/json",
        "MS-PartnerCenter-Application": CONFIG.COMPANY_NAME,
      },
    }
  );
  if (!res.ok) {
    console.warn(`Could not fetch subscriptions for customer ${customerId}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  return json.items || [];
}

function mapSubscriptionToRow(sub, rowId) {
  const toDate = (iso) => (iso && !iso.startsWith("0001") && !iso.startsWith("1900") && !iso.startsWith("9999") ? iso.slice(0, 10) : "");
  
  const startDate = toDate(sub.effectiveStartDate || sub.creationDate || "");
  const renewalDate = toDate(sub.commitmentEndDate || sub.currentStateEndDate || "");
  
  // Calculate billing frequency from date difference
  let billing = "Annual"; // default
  if (startDate && renewalDate) {
    const start = new Date(startDate);
    const renewal = new Date(renewalDate);
    const daysDiff = Math.round((renewal - start) / (1000 * 60 * 60 * 24));
    
    // Determine billing cycle based on days difference
    if (daysDiff >= 28 && daysDiff <= 32) {
      billing = "Monthly";
    } else if (daysDiff >= 85 && daysDiff <= 95) {
      billing = "Quarterly";
    } else if (daysDiff >= 355 && daysDiff <= 380) {
      billing = "Annual";
    } else if (daysDiff >= 700 && daysDiff <= 760) {
      billing = "Biennial";
    } else if (daysDiff >= 1050 && daysDiff <= 1120) {
      billing = "Triennial";
    }
    // If none match, check billingCycleName as fallback
    else {
      const billingMap = { "monthly": "Monthly", "annual": "Annual", "full payment": "Annual", "quarterly": "Quarterly" };
      billing = billingMap[(sub.billingCycleName || "").toLowerCase()] || "Annual";
    }
  }

  return {
    id:      rowId,
    client:  sub.customerName || "Unknown",
    plan:    sub.friendlyName || sub.productName || "Unknown Plan",
    seats:   sub.licenseCount || 1,
    cost:    0,
    start:   startDate,
    renewal: renewalDate,
    billing: billing,
    email:   sub.customerEmail || "",
    notes:   "",
    _subId:  sub.id || "",
    _status: (sub.status || "active").toLowerCase(),
  };
}

// ── Insights Analytics API (partner-level, no per-customer GDAP needed) ────

async function fetchSubscriptionsFromInsights(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept:        "application/json",
    "MS-PartnerCenter-Application": CONFIG.COMPANY_NAME,
  };

  const analyticsUrl = `${CONFIG.PARTNER_CENTER_API}/partner/v1/analytics/subscriptions`;
  const res = await fetchWithTimeout(analyticsUrl, { headers }, 60000);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn(`Analytics API failed (${res.status}):`, errText);
    throw new Error(`Partner Insights API failed (${res.status}). ${errText}`);
  }

  const data = await res.json();
  const items = data.Value || data.value || data.items || data || [];

  if (!Array.isArray(items)) {
    console.warn("Unexpected Insights response shape:", data);
    throw new Error("Unexpected response from Partner Insights API");
  }

  return items;
}

// ── Fallback: customer-level API (needs GDAP) ─────────────────────────────

async function fetchSubscriptionsPerCustomer(token, onProgress) {
  const customers = await fetchAllCustomers(token);
  const total = customers.length;
  const BATCH_SIZE = 5;
  const allSubs = [];
  let done = 0;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (customer) => {
        const subs = await fetchCustomerSubscriptions(token, customer.id);
        return subs.map((sub) => ({
          ...sub,
          customerName:     customer.companyProfile?.companyName || customer.id,
          customerTenantId: customer.id,
          customerEmail:    customer.primaryContact?.email || "",
        }));
      })
    );
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") allSubs.push(...result.value);
      else console.warn("Failed for a customer:", result.reason);
    });
    done += batch.length;
    if (onProgress) onProgress(done, total);
  }

  return allSubs;
}

export async function syncFromPartnerCenter(onProgress) {
  const token = await getToken(CONFIG.PARTNER_CENTER_SCOPES);
  let items;

  // Try Insights API first (no GDAP needed), fall back to per-customer API
  try {
    if (onProgress) onProgress(0, 1);
    items = await fetchSubscriptionsFromInsights(token);
    console.log(`Insights API returned ${items.length} subscriptions`);
    if (onProgress) onProgress(1, 1);
  } catch (insightsErr) {
    console.warn("Insights API unavailable, trying per-customer API:", insightsErr.message);
    items = await fetchSubscriptionsPerCustomer(token, onProgress);
  }

  // Filter to active/warning subscriptions (skip deleted/deprovisioned)
  const activeItems = items.filter((sub) => {
    const status = (sub.subscriptionStatus || sub.status || "active").toLowerCase();
    return status !== "deleted" && status !== "deprovisioned";
  });

  const rows = activeItems.map((sub, i) => mapSubscriptionToRow(sub, i + 1));

  // ── Post-processing: remove stale disabled & dedup active vs disabled ───────
  const cleaned = rows.filter((r) => {
    if (!r.renewal) return true; // keep rows with no renewal date
    const days = daysLeft(r.renewal);
    // Remove subscriptions overdue for more than 10 days
    if (days < -10) return false;
    return true;
  });

  // Dedup: if same client + same plan has both active and disabled, keep only active
  const keyMap = new Map();
  for (const r of cleaned) {
    const key = `${r.client.toLowerCase()}||${r.plan.toLowerCase()}`;
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key).push(r);
  }
  const deduped = [];
  for (const [, group] of keyMap) {
    const hasActive = group.some((r) => {
      if (!r.renewal) return false;
      const s = getStatus(daysLeft(r.renewal));
      return s === "active" || s === "expiring";
    });
    if (hasActive) {
      // Keep only non-disabled rows
      for (const r of group) {
        if (!r.renewal) { deduped.push(r); continue; }
        const s = getStatus(daysLeft(r.renewal));
        if (s !== "disabled") deduped.push(r);
      }
    } else {
      deduped.push(...group);
    }
  }

  if (import.meta.env.DEV) {
    console.log(`Post-processing: ${rows.length} → ${cleaned.length} (removed ${rows.length - cleaned.length} stale disabled) → ${deduped.length} (deduped ${cleaned.length - deduped.length})`);
  }

  // Sync data to backend for email reminders
  try {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    await fetch(`${BACKEND_URL}/api/sync-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions: deduped })
    });
    console.log('✅ Synced subscription data to email backend');
  } catch (error) {
    console.warn('⚠️ Failed to sync to email backend:', error.message);
    // Don't fail the whole sync if backend is down
  }

  return deduped;
}
