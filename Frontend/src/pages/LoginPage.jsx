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

  // Return user to where they came from after login
  const destination = location.state?.from?.pathname || "/";

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage("");
      setIsLoading(true);

      // 1) Firebase login
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result?.user ?? auth.currentUser;
      if (!firebaseUser) throw new Error("No Firebase user after sign-in.");

      // 2) Sync user to backend DB (non-blocking for UI login)
      try {
        const token = await firebaseUser.getIdToken();
        await syncUser(token);
      } catch (syncError) {
        console.warn(
          "Backend user sync failed. Firebase login is still active.",
          syncError
        );
      }

      // 3) Navigate into protected app
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
        background: "#111827",
        color: "#f9fafb",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "16px",
          padding: "32px",
          display: "grid",
          gap: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>Cosplanner Login</h1>
        <p style={{ margin: 0, color: "#9ca3af" }}>
          Sign in with Google to continue to your projects.
        </p>

        {errorMessage ? (
          <p style={{ margin: 0, color: "#fca5a5" }}>{errorMessage}</p>
        ) : null}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
          }}
        >
          {isLoading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}