/**
 * ============================================================
 *  MS365 License Tracker — Microsoft Partner Center API
 *
 *  Handles:
 *   - MSAL authentication (login / logout / token refresh)
 *   - Fetching all customer tenants from Partner Center
 *   - Fetching subscriptions for each customer
 *   - Mapping raw API data to the tracker's data format
 * ============================================================
 */

// ── MSAL Instance Setup ────────────────────────────────────────────────────────

// ── Fetch with timeout helper ──────────────────────────────────────────────────
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

// Only initialise MSAL if a real Client ID has been configured.
const IS_CONFIGURED = CONFIG.CLIENT_ID !== "YOUR_CLIENT_ID_HERE";
const msalInstance  = IS_CONFIGURED ? new msal.PublicClientApplication(msalConfig) : null;

// ── Auth Helpers ───────────────────────────────────────────────────────────────

/**
 * Get a valid access token, silently if possible, otherwise via popup.
 */
async function getToken(scopes) {
  if (!msalInstance) throw new Error("MSAL not configured.");

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error("No signed-in account.");

  try {
    const result = await msalInstance.acquireTokenSilent({ scopes, account: accounts[0] });
    return result.accessToken;
  } catch (err) {
    // Silent acquisition failed — fall back to popup.
    const result = await msalInstance.acquireTokenPopup({ scopes });
    return result.accessToken;
  }
}

/**
 * Sign in via Microsoft popup.
 * Returns the signed-in account object.
 */
async function signIn() {
  if (!msalInstance) throw new Error("Configure CLIENT_ID and TENANT_ID in config.js first.");
  const result = await msalInstance.loginPopup({ scopes: CONFIG.SCOPES });
  return result.account;
}

/**
 * Sign out and clear session.
 */
async function signOut() {
  if (!msalInstance) return;
  const account = msalInstance.getAllAccounts()[0];
  if (account) {
    await msalInstance.logoutPopup({ account });
  }
}

/**
 * Returns the currently signed-in account, or null.
 */
function getCurrentAccount() {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

// ── Partner Center API Calls ───────────────────────────────────────────────────

/**
 * Fetch all customers (tenants) from Partner Center.
 * Docs: GET /v1/customers
 */
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

    // Follow pagination links
    url = json.links?.next?.uri ? `${CONFIG.PARTNER_CENTER_API}${json.links.next.uri}` : null;
  }

  return customers;
}

/**
 * Fetch all subscriptions for a single customer.
 * Docs: GET /v1/customers/{customer-id}/subscriptions
 */
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
    // Non-fatal: some customers may have no subscriptions or restricted access
    console.warn(`Could not fetch subscriptions for customer ${customerId}: ${res.status}`);
    return [];
  }

  const json = await res.json();
  return json.items || [];
}

// ── Data Mapping ───────────────────────────────────────────────────────────────

/**
 * Map a Partner Center subscription object to the tracker's row format.
 *
 * Partner Center subscription fields used:
 *   id, offerId, offerName, quantity, unitType,
 *   commitmentEndDate, creationDate, billingCycle,
 *   status, autoRenewEnabled
 */
function mapSubscriptionToRow(customer, sub, rowId) {
  // Commitment end date → renewal date
  const renewalRaw = sub.commitmentEndDate || sub.termEndDate || "";
  const startRaw   = sub.creationDate || sub.effectiveStartDate || "";

  // Normalise to YYYY-MM-DD
  const toDate = (iso) => (iso ? iso.slice(0, 10) : "");

  // Billing cycle: API returns "monthly", "annual", "triennial" etc.
  const billingMap = { monthly: "Monthly", annual: "Annual", triennial: "Annual" };
  const billing    = billingMap[(sub.billingCycle || "").toLowerCase()] || "Monthly";

  // Cost: Partner Center doesn't expose reseller cost via this endpoint.
  // We store 0 and let the user fill it in manually, or it can be enriched later.
  const cost = sub.unitPrice ? Math.round(sub.unitPrice * (sub.quantity || 1)) : 0;

  return {
    id:      rowId,
    client:  customer.companyProfile?.companyName || customer.id,
    plan:    sub.offerName || sub.offerId || "Unknown Plan",
    seats:   sub.quantity || 1,
    cost:    cost,
    start:   toDate(startRaw),
    renewal: toDate(renewalRaw),
    billing: billing,
    email:   customer.primaryContact?.email || "",
    notes:   sub.autoRenewEnabled ? "Auto-renew ON" : "Auto-renew OFF",
    // Extra fields from the API (kept for reference, not shown in main table)
    _tenantId:  customer.id,
    _subId:     sub.id,
    _status:    sub.status,
  };
}

// ── Main Sync Function ─────────────────────────────────────────────────────────

/**
 * Full sync: fetch all customers + all their subscriptions.
 * Returns an array of tracker row objects.
 *
 * @param {function} onProgress  - Called with (fetched, total) during sync
 */
async function syncFromPartnerCenter(onProgress) {
  // 1. Get Partner Center token
  const token = await getToken(CONFIG.SCOPES);

  // 2. Fetch all customers
  const customers = await fetchAllCustomers(token);
  const total = customers.length;

  // 3. Fetch subscriptions for each customer in parallel (batched to avoid throttling)
  const BATCH_SIZE = 5;
  const rows = [];
  let rowId  = 1;
  let done   = 0;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (customer) => {
        const subs = await fetchCustomerSubscriptions(token, customer.id);
        return subs.map((sub) => mapSubscriptionToRow(customer, sub, rowId++));
      })
    );

    batchResults.forEach((result) => {
      if (result.status === "fulfilled") rows.push(...result.value);
      else console.warn("Failed to fetch subscriptions for a customer:", result.reason);
    });
    done += batch.length;
    if (onProgress) onProgress(done, total);
  }

  return rows;
}
