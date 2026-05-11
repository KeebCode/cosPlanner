import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getProjects, getProjectChecklistSummary } from "../services/api";

export default function ChecklistDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function getToken() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      navigate("/login", { replace: true });
      return null;
    }
    return firebaseUser.getIdToken();
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) return;

      const projectsData = await getProjects(token);
      setProjects(projectsData || []);

      // Fetch summaries for each project
      const summariesData = {};
      for (const project of projectsData) {
        try {
          const summary = await getProjectChecklistSummary(token, project.id);
          summariesData[project.id] = summary;
        } catch (err) {
          console.error(`Failed to fetch summary for project ${project.id}`, err);
          summariesData[project.id] = { allCount: 0, todayCount: 0, scheduledCount: 0, completedCount: 0, overdueCount: 0 };
        }
      }
      setSummaries(summariesData);
    } catch (err) {
      console.error("Failed to load projects and summaries", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", color: "#64748b", fontSize: "0.875rem" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ color: "#1e293b", maxWidth: 1200, padding: "28px 32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>
          Checklist Dashboard
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
          Track progress across all your cosplay projects.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: "0.875rem",
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {projects.map((project) => {
          const summary = summaries[project.id] || { allCount: 0, todayCount: 0, scheduledCount: 0, completedCount: 0, overdueCount: 0 };
          const totalCount = summary.allCount + summary.completedCount;
          const donePercent = totalCount
            ? Math.round((summary.completedCount / totalCount) * 100)
            : 0;

          return (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/checklist`)}
              style={{
                background: "#ffffff",
                padding: 20,
                borderRadius: 14,
                cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c4b5fd";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(109,40,217,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
              }}
            >
              {/* Project name + icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  ✂
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
                  {project.name}
                </h3>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b", marginBottom: 4 }}>
                  <span>Progress</span>
                  <span>{donePercent}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${donePercent}%`,
                      background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>

              {/* Stat grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Today", value: summary.todayCount, bg: "#eff6ff", color: "#1e40af" },
                  { label: "Scheduled", value: summary.scheduledCount, bg: "#f0fdf4", color: "#15803d" },
                  { label: "All", value: summary.allCount, bg: "#f8fafc", color: "#475569" },
                  { label: "Completed", value: summary.completedCount, bg: "#f0fdf4", color: "#15803d" },
                ].map(({ label, value, bg, color }) => (
                  <div
                    key={label}
                    style={{
                      background: bg,
                      borderRadius: 8,
                      padding: "8px 10px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{label}</div>
                  </div>
                ))}
              </div>

              {summary.overdueCount > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "8px 10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#dc2626" }}>
                    {summary.overdueCount}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Overdue</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            background: "#f8fafc",
            color: "#94a3b8",
            fontSize: "0.875rem",
          }}
        >
          No projects found. Create a project to get started.
        </div>
      )}
    </div>
  );
}
