import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase";
import {
  getProjects,
  createProject,
  getInventoryItems,
  getChecklist,
  getProjectChecklistSummary,
  getProfile,
} from "../../services/api";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [projectSummaries, setProjectSummaries] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [checklistCategories, setChecklistCategories] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [profileData, setProfileData] = useState(null);

  const projectMatch = location.pathname.match(/\/project\/(\d+)/);
  const currentProjectId = projectMatch?.[1];

  const isPlanningActive = location.pathname.includes("/planning");
  const isInventoryActive = location.pathname.includes("/inventory");
  const isChecklistActive = location.pathname.includes("/checklist");
  const isProjectsActive = location.pathname === "/";

  async function getToken() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  }

  async function loadProfile() {
    try {
      const token = await getToken();
      if (!token) return;
      const prof = await getProfile(token);
      setProfileData(prof);
    } catch {
      // silently ignore — avatar will fall back to initials
    }
  }

  async function loadProjects() {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getProjects(token);
      const list = data || [];
      setProjects(list);

      const summaries = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            const s = await getProjectChecklistSummary(token, p.id);
            summaries[p.id] = s;
          } catch {
            summaries[p.id] = { allCount: 0, completedCount: 0 };
          }
        })
      );
      setProjectSummaries(summaries);
    } catch (err) {
      console.error("Sidebar: failed to load projects", err);
    }
  }

  async function loadProjectDetails(projectId) {
    try {
      const token = await getToken();
      if (!token) return;
      const [inv, checklist] = await Promise.all([
        getInventoryItems(token, projectId),
        getChecklist(token, projectId),
      ]);

      setInventoryItems(inv || []);

      const catMap = {};
      (checklist || []).forEach((item) => {
        const cat = item.checklist_category || "Uncategorized";
        if (!catMap[cat]) catMap[cat] = { total: 0, completed: 0 };
        catMap[cat].total++;
        if (item.checklist_completed === 1) catMap[cat].completed++;
      });
      setChecklistCategories(Object.entries(catMap));
    } catch (err) {
      console.error("Sidebar: failed to load project details", err);
    }
  }

  useEffect(() => {
    loadProfile();
    loadProjects();
  }, [location.pathname]);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectDetails(currentProjectId);
    } else {
      setInventoryItems([]);
      setChecklistCategories([]);
    }
  }, [currentProjectId]);

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const result = await createProject(token, { project_name: newProjectName.trim() });
      const newId = result?.cos_id ?? result?.result?.[0]?.costume_id;
      setNewProjectName("");
      setShowNewProjectModal(false);
      await loadProjects();
      if (newId) navigate(`/project/${newId}/planning`);
    } catch (err) {
      console.error("Failed to create project", err);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  function navItemStyle(active, disabled = false) {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 10px",
      borderRadius: "7px",
      cursor: disabled ? "not-allowed" : "pointer",
      textDecoration: "none",
      color: disabled ? "#cbd5e1" : active ? "#6d28d9" : "#1e293b",
      background: active ? "#ede9fe" : "transparent",
      fontWeight: active ? 600 : 400,
      fontSize: "0.875rem",
      marginBottom: "2px",
      opacity: disabled ? 0.5 : 1,
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

  function Badge({ children, color = "#6d28d9", bg = "#ede9fe" }) {
    return (
      <span style={{
        background: bg,
        color,
        borderRadius: "9999px",
        padding: "1px 7px",
        fontSize: "0.68rem",
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {children}
      </span>
    );
  }

  const currentProject = projects.find((p) => String(p.id) === String(currentProjectId));

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "0 24px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "1.4rem", color: "white" }}>✂</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>CosPlanner</div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.75rem" }}>{user?.displayName || user?.email || ""}</div>
        </div>

        {/* Profile avatar */}
        <button
          onClick={() => navigate("/profile")}
          title="View profile"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.15)",
            cursor: "pointer",
            padding: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "white",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          {profileData?.profile_picture
            ? <img src={profileData.profile_picture} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (profileData?.user_name || user?.email || "?").slice(0, 2).toUpperCase()
          }
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{
          width: "256px",
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            <div style={sectionLabel}>Navigation</div>

            {/* Projects */}
            <Link to="/" style={navItemStyle(isProjectsActive)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📁</span>
                <span>Projects</span>
              </div>
            </Link>

            {/* Project list */}
            <div style={{ paddingLeft: "8px", marginBottom: "4px" }}>
              {projects.map((p) => {
                const s = projectSummaries[p.id];
                const total = s ? s.allCount + s.completedCount : 0;
                const completed = s ? s.completedCount : 0;
                const isActive = String(p.id) === String(currentProjectId);
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/project/${p.id}/planning`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "none",
                      background: isActive ? "#f5f3ff" : "transparent",
                      color: isActive ? "#6d28d9" : "#475569",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      marginBottom: "1px",
                      textAlign: "left",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    {total > 0 && (
                      <span title={`${completed} of ${total} tasks done`}>
                        <Badge color={isActive ? "#6d28d9" : "#64748b"} bg={isActive ? "#ede9fe" : "#f1f5f9"}>
                          ✓ {completed}/{total}
                        </Badge>
                      </span>
                    )}
                  </button>
                );
              })}

              {/* + New Project */}
              <button
                onClick={() => setShowNewProjectModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  color: "#6d28d9",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                <span>+</span>
                <span>New Project</span>
              </button>
            </div>

            {/* Garment Planning */}
            {currentProjectId ? (
              <Link to={`/project/${currentProjectId}/planning`} style={navItemStyle(isPlanningActive)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✂</span>
                  <span>Garment Planning</span>
                </div>
              </Link>
            ) : (
              <div title="Select a project first" style={navItemStyle(false, true)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✂</span>
                  <span>Garment Planning</span>
                </div>
              </div>
            )}

            {/* Inventory */}
            {currentProjectId ? (
              <>
                <Link to={`/project/${currentProjectId}/inventory`} style={navItemStyle(isInventoryActive)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📦</span>
                    <span>Inventory</span>
                  </div>
                  {inventoryItems.length > 0 && (
                    <Badge>{inventoryItems.length}</Badge>
                  )}
                </Link>
                <div style={{ paddingLeft: "28px", marginBottom: "4px" }}>
                  {inventoryItems.length === 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "2px 10px" }}>No stock yet</div>
                  ) : null}
                  <Link
                    to={`/project/${currentProjectId}/inventory?add=1`}
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6d28d9",
                      padding: "2px 10px",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    + Add Stock
                  </Link>
                </div>
              </>
            ) : (
              <div title="Select a project first" style={navItemStyle(false, true)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📦</span>
                  <span>Inventory</span>
                </div>
              </div>
            )}

            {/* Checklist */}
            <Link to="/checklist" style={navItemStyle(isChecklistActive)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✅</span>
                <span>Checklist</span>
              </div>
            </Link>

            {/* Checklist categories */}
            {currentProjectId && checklistCategories.length > 0 && (
              <div style={{ paddingLeft: "28px", marginBottom: "4px" }}>
                {checklistCategories.map(([cat, counts]) => (
                  <Link
                    key={cat}
                    to={`/project/${currentProjectId}/checklist`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      color: "#475569",
                      fontSize: "0.78rem",
                      marginBottom: "1px",
                    }}
                  >
                    <span>{cat}</span>
                    <Badge color="#64748b" bg="#f1f5f9">
                      {counts.completed}/{counts.total}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
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
        <div style={{ flex: 1, height: "100%", overflow: "auto", background: "#f1f5f9", color: "#1e293b" }}>
          <Outlet />
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div
          onClick={() => { setShowNewProjectModal(false); setNewProjectName(""); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              width: "360px",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
              Create New Project
            </h2>
            <input
              autoFocus
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#1e293b",
                fontSize: "0.875rem",
                boxSizing: "border-box",
                marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => { setShowNewProjectModal(false); setNewProjectName(""); }}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  border: "1px solid #e2e8f0", background: "#f1f5f9",
                  color: "#64748b", cursor: "pointer", fontSize: "0.875rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 600,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
