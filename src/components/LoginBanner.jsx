export default function LoginBanner({ onSignIn, isLoading, isConfigured }) {
  return (
    <div className="login-banner">
      <div className="lb-icon">🔗</div>
      <div className="lb-content">
        <div className="lb-title">
          {isConfigured ? "Connect to Microsoft Partner Center" : "Partner Center not configured"}
        </div>
        <div className="lb-sub">
          {isConfigured
            ? "Sign in with your Microsoft partner account to automatically load all client license data."
            : "Add your VITE_CLIENT_ID and VITE_TENANT_ID in .env to enable live sync. Showing demo data for now."}
        </div>
      </div>
      {isConfigured && (
        <button className="btn primary" onClick={onSignIn} disabled={isLoading}>
          {isLoading ? "Signing in…" : "🔑 Sign in with Microsoft"}
        </button>
      )}
    </div>
  );
}
