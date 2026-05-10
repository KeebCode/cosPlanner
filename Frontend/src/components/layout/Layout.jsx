import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const isPlanningActive = location.pathname.includes("/planning");
  const isInventoryActive = location.pathname.includes("/inventory");
  const isChecklistActive = location.pathname.includes("/checklist");
  const isProjectsActive = location.pathname === "/";

  function navItemStyle(active) {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 10px",
      borderRadius: "7px",
      cursor: "pointer",
      textDecoration: "none",
      color: active ? "#6d28d9" : "#1e293b",
      background: active ? "#ede9fe" : "transparent",
      fontWeight: active ? 600 : 400,
      fontSize: "0.875rem",
      marginBottom: "2px",
    };
  }

  function badgeStyle(color) {
    return {
      background: color || "#3b82f6",
      color: "white",
      borderRadius: "9999px",
      padding: "1px 7px",
      fontSize: "0.68rem",
      fontWeight: 600,
      flexShrink: 0,
    };
  }

  const sectionLabel = {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
    textTransform: "uppercase",
    padding: "10px 10px 4px",
    marginTop: "4px",
  };

  const subItem = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 10px",
    borderRadius: "6px",
    textDecoration: "none",
    color: "#475569",
    fontSize: "0.82rem",
    marginBottom: "1px",
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          padding: "0 24px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "1.4rem", color: "white" }}>✂</span>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
            CosPlanner
          </div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.75rem" }}>
            {user?.displayName || user?.email || ""}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "256px",
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            <div style={sectionLabel}>Navigation</div>

            {/* Projects */}
            <div>
              <Link to="/" style={navItemStyle(isProjectsActive)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📁</span>
                  <span>Projects</span>
                </div>
                <span style={badgeStyle()}>1</span>
              </Link>
              <div style={{ paddingLeft: "24px" }}>
                <Link to="/" style={subItem}>
                  <span>My First Project</span>
                  <span style={badgeStyle("#94a3b8")}>0/4</span>
                </Link>
                <Link to="/" style={{ ...subItem, color: "#6d28d9" }}>
                  + New Project
                </Link>
              </div>
            </div>

            {/* Garment Planning */}
            <Link to="/project/1/planning" style={navItemStyle(isPlanningActive)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✂</span>
                <span>Garment Planning</span>
              </div>
            </Link>

            {/* Inventory */}
            <div>
              <Link to="/project/1/inventory" style={navItemStyle(isInventoryActive)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📦</span>
                  <span>Inventory</span>
                </div>
                <span style={badgeStyle()}>0</span>
              </Link>
              <div style={{ paddingLeft: "24px" }}>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", padding: "4px 10px" }}>
                  No fabric stock
                </div>
                <Link to="/project/1/inventory" style={{ ...subItem, color: "#6d28d9" }}>
                  + Add Stock
                </Link>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <Link to="/checklist" style={navItemStyle(isChecklistActive)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✅</span>
                  <span>Checklist</span>
                </div>
                <span style={badgeStyle()}>0/4</span>
              </Link>
              <div style={{ paddingLeft: "24px" }}>
                {[["Cutting", "0/2"], ["Sewing", "0/1"], ["General", "0/1"]].map(([name, count]) => (
                  <Link key={name} to="/checklist" style={subItem}>
                    <span>{name}</span>
                    <span style={badgeStyle("#94a3b8")}>{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: "12px", borderTop: "1px solid #e2e8f0" }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            height: "100%",
            overflow: "auto",
            background: "#f1f5f9",
            color: "#1e293b",
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
