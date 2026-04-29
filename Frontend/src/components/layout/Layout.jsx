import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Wait for Firebase sign-out to complete before redirecting
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
      }}
    >
      {/* sidebar */}
      <div
        style={{
          width: "250px",
          background: "#e5e5e5",
          padding: "20px",
        }}
      >
        <h3>Menu</h3>
        <p style={{ marginTop: 0 }}>
          Signed in: {user?.displayName || user?.email || "Unknown user"}
        </p>
        <p style={{ color: "#4b5563" }}>User ID: {user?.uid || "N/A"}</p>

        <Link to="/">Projects</Link>
        <br />
        
        <Link to="/project/1/planning">Garment Planning</Link>
        <br />

        <Link to="/project/1/inventory">Inventory</Link>
        <br />

        <Link to="/checklist">Checklist</Link>
        <br />
        <br />

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: "8px",
            background: "#111827",
            color: "white",
            cursor: "pointer",
          }}
        >
          Log Out
        </button>
      </div>

      {/* main content */}
      <div
        style={{
          flex: 1,
          height: "100%",
          padding: "40px",
          background: "#1e1e1e",
          color: "white",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
