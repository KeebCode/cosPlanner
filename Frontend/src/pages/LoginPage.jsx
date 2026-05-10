import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { syncUser } from "../services/api";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Card header */}
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            padding: "28px 32px 24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "1.8rem", color: "white" }}>✂</span>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "1.3rem" }}>CosPlanner</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem" }}>
              Cosplay project management
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "28px 32px", display: "grid", gap: "16px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.2rem", color: "#1e293b", fontWeight: 700 }}>
              Welcome back
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
              Sign in with Google to continue to your projects.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.875rem",
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{
              padding: "12px 16px",
              border: "none",
              borderRadius: "10px",
              cursor: isLoading ? "default" : "pointer",
              background: isLoading
                ? "#c4b5fd"
                : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>G</span>
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
