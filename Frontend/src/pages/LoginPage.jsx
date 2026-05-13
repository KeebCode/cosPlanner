import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { syncUser } from "../services/api";

const FEATURES = [
  {
    icon: "✂",
    title: "Garment Planning",
    desc: "Drag-and-drop pattern layout with auto-optimize and DXF export for cutting machines.",
  },
  {
    icon: "📦",
    title: "Inventory Tracking",
    desc: "Track materials with real-time status: Owned, Need to Buy, or Low on Stock.",
  },
  {
    icon: "✅",
    title: "Project Checklists",
    desc: "Task lists with due dates, urgency flags, and an all-projects dashboard view.",
  },
  {
    icon: "📐",
    title: "Measurements",
    desc: "Store body measurements per costume for accurate pattern scaling every time.",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const destination = location.state?.from?.pathname || "/";

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage("");
      setIsLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result?.user ?? auth.currentUser;
      if (!firebaseUser) throw new Error("No Firebase user after sign-in.");

      try {
        const token = await firebaseUser.getIdToken();
        await syncUser(token);
      } catch (syncError) {
        console.warn("Backend user sync failed. Firebase login is still active.", syncError);
      }

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setErrorMessage("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left branding panel */}
      <div
        style={{
          flex: "0 0 55%",
          background: "linear-gradient(145deg, #3730a3 0%, #4f46e5 35%, #7c3aed 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 64px",
          color: "white",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 44 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
            }}
          >
            ✂
          </div>
          <div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
              CosPlanner
            </div>
            <div style={{ fontSize: "0.88rem", opacity: 0.75, marginTop: 3 }}>
              Your cosplay project studio
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "1.1rem",
            opacity: 0.88,
            lineHeight: 1.65,
            marginBottom: 44,
            maxWidth: 420,
          }}
        >
          Plan, build, and track every detail of your cosplay — from pattern layout to convention day.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.93rem", marginBottom: 2 }}>{f.title}</div>
                <div style={{ opacity: 0.7, fontSize: "0.81rem", lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative bottom note */}
        <div
          style={{
            marginTop: 52,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            fontSize: "0.78rem",
            opacity: 0.55,
          }}
        >
          Built for cosplayers, by cosplayers.
        </div>
      </div>

      {/* Right login panel */}
      <div
        style={{
          flex: "0 0 45%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 52px",
          background: "#ffffff",
        }}
      >
        <div style={{ width: "100%", maxWidth: 340 }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h2>
          <p style={{ margin: "0 0 36px", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.5 }}>
            Sign in to pick up where you left off.
          </p>

          {errorMessage && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.875rem",
                marginBottom: 20,
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.13)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
            }}
            style={{
              width: "100%",
              padding: "13px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              cursor: isLoading ? "default" : "pointer",
              background: isLoading ? "#f8fafc" : "#ffffff",
              color: "#1e293b",
              fontWeight: 600,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.15s",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.5 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.5 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.8-2.2 5.2-4.7 6.8l7.3 5.7C43.1 37 46.5 31.2 46.5 24.5z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l7.3-5.7-.7-.3z"/>
              <path fill="#34A853" d="M24 47c5.4 0 10-1.8 13.3-4.8l-7.3-5.7c-1.8 1.2-4.1 1.9-6.7 1.9-6.3 0-11.6-4-13.4-9.5l-7.3 5.7C7.1 41.4 14.9 47 24 47z"/>
            </svg>
            {isLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <p
            style={{
              textAlign: "center",
              marginTop: 36,
              fontSize: "0.78rem",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            By signing in you agree to use CosPlanner<br />for all your cosplay planning needs 🧵
          </p>
        </div>
      </div>
    </div>
  );
}
