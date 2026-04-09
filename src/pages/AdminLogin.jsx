import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, getCurrentAccount } from "../api";
import { ADMIN_EMAILS, IS_CONFIGURED } from "../config";
import { useState } from "react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already signed in as admin, redirect to dashboard
  useEffect(() => {
    const account = getCurrentAccount();
    if (account && ADMIN_EMAILS.includes(account.username?.toLowerCase())) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleAdminSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      const account = await signIn();
      if (!ADMIN_EMAILS.includes(account.username?.toLowerCase())) {
        setError("Access denied. Your account is not authorized as an administrator.");
        return;
      }
      // Redirect to dashboard — App will pick up the MSAL session
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/assets/xownsolutions.png" alt="XOWN Solutions" />
        </div>
        <h1 className="admin-login-title">Admin Console</h1>
        <p className="admin-login-sub">
          Sign in with your Microsoft email to manage licenses, sync data, and configure settings.
        </p>

        {error && (
          <div className="admin-login-error">
            <span>✕</span> {error}
          </div>
        )}

        {IS_CONFIGURED ? (
          <button
            className="admin-login-btn"
            onClick={handleAdminSignIn}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            {isLoading ? "Signing in…" : "Sign in with Microsoft"}
          </button>
        ) : (
          <div className="admin-login-unconfigured">
            <span>⚠</span> Microsoft authentication is not configured. Add VITE_CLIENT_ID and VITE_TENANT_ID in your .env file.
          </div>
        )}

        <div className="admin-login-footer">
          <a href="/" className="admin-login-back">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
