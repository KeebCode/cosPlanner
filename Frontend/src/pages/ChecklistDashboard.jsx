// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { auth } from "../firebase";
// import {
//   getChecklistSummary,
//   getTodayChecklists,
//   getScheduledChecklists,
//   getCompletedChecklists,
//   getOverdueChecklists,
//   getAllChecklists,
//   updateChecklistItem,
// } from "../services/api";

// const URGENCY_COLORS = {
//   none: "#666",
//   low: "#34d399",
//   medium: "#fbbf24",
//   high: "#f87171",
// };

// function formatDate(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// }

// export default function ChecklistDashboard() {
//   const navigate = useNavigate();
//   const [summary, setSummary] = useState(null);
//   const [checklists, setChecklists] = useState([]);
//   const [activeTab, setActiveTab] = useState("today");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [hoveredProject, setHoveredProject] = useState(null);

//   async function getToken() {
//     const firebaseUser = auth.currentUser;
//     if (!firebaseUser) {
//       navigate("/login", { replace: true });
//       return null;
//     }
//     return firebaseUser.getIdToken();
//   }

//   async function loadData() {
//     try {
//       setLoading(true);
//       setError("");
//       const token = await getToken();
//       if (!token) return;

//       const summaryData = await getChecklistSummary(token);
//       setSummary(summaryData);

//       let data;
//       switch (activeTab) {
//         case "today":
//           data = await getTodayChecklists(token);
//           break;
//         case "scheduled":
//           data = await getScheduledChecklists(token);
//           break;
//         case "completed":
//           data = await getCompletedChecklists(token);
//           break;
//         case "overdue":
//           data = await getOverdueChecklists(token);
//           break;
//         default:
//           data = await getAllChecklists(token);
//       }
//       setChecklists(data || []);
//     } catch (err) {
//       console.error("Failed to load checklist data", err);
//       setError("Failed to load checklists");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadData();
//   }, [activeTab]);

//   async function handleToggleTask(task) {
//     try {
//       const token = await getToken();
//       if (!token) return;

//       await updateChecklistItem(token, task.id, { completed: !task.completed });
//       await loadData();
//     } catch (err) {
//       console.error("Failed to toggle task", err);
//     }
//   }

//   const groupedByProject = checklists.reduce((acc, item) => {
//     const projectName = item.projectName || "Uncategorized";
//     if (!acc[projectName]) acc[projectName] = [];
//     acc[projectName].push(item);
//     return acc;
//   }, {});

//   if (loading) {
//     return <div style={{ color: "#f5f5f5", padding: 20 }}>Loading...</div>;
//   }

//   return (
//     <div style={{ color: "#f5f5f5", maxWidth: 900, margin: "0 auto", padding: 20 }}>
//       <h1 style={{ margin: "0 0 24px 0", fontSize: 32, fontWeight: 700 }}>Reminders</h1>

//       {error && (
//         <div style={{ background: "#ff4444", color: "white", padding: 12, borderRadius: 8, marginBottom: 20 }}>
//           {error}
//         </div>
//       )}

//       {summary && (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: 12,
//             marginBottom: 24,
//           }}
//         >
//           <div
//             onClick={() => setActiveTab("today")}
//             style={{
//               background: activeTab === "today" ? "#3b82f6" : "#1e40af",
//               padding: 20,
//               borderRadius: 12,
//               cursor: "pointer",
//               transition: "all 0.2s",
//               border: activeTab === "today" ? "2px solid white" : "none",
//             }}
//           >
//             <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{summary.todayCount}</div>
//             <div style={{ fontSize: 16, opacity: 0.9 }}>Today</div>
//           </div>

//           <div
//             onClick={() => setActiveTab("scheduled")}
//             style={{
//               background: activeTab === "scheduled" ? "#ec4899" : "#be185d",
//               padding: 20,
//               borderRadius: 12,
//               cursor: "pointer",
//               transition: "all 0.2s",
//               border: activeTab === "scheduled" ? "2px solid white" : "none",
//             }}
//           >
//             <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{summary.scheduledCount}</div>
//             <div style={{ fontSize: 16, opacity: 0.9 }}>Scheduled</div>
//           </div>

//           <div
//             onClick={() => setActiveTab("all")}
//             style={{
//               background: activeTab === "all" ? "#4b5563" : "#2d3748",
//               padding: 20,
//               borderRadius: 12,
//               cursor: "pointer",
//               transition: "all 0.2s",
//               border: activeTab === "all" ? "2px solid white" : "none",
//             }}
//           >
//             <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{summary.allCount}</div>
//             <div style={{ fontSize: 16, opacity: 0.9 }}>All</div>
//           </div>

//           <div
//             onClick={() => setActiveTab("completed")}
//             style={{
//               background: activeTab === "completed" ? "#6b7280" : "#4b5563",
//               padding: 20,
//               borderRadius: 12,
//               cursor: "pointer",
//               transition: "all 0.2s",
//               border: activeTab === "completed" ? "2px solid white" : "none",
//             }}
//           >
//             <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{summary.completedCount}</div>
//             <div style={{ fontSize: 16, opacity: 0.9 }}>Completed</div>
//           </div>

//           {summary.overdueCount > 0 && (
//             <div
//               onClick={() => setActiveTab("overdue")}
//               style={{
//                 background: activeTab === "overdue" ? "#dc2626" : "#991b1b",
//                 padding: 20,
//                 borderRadius: 12,
//                 cursor: "pointer",
//                 transition: "all 0.2s",
//                 border: activeTab === "overdue" ? "2px solid white" : "none",
//                 gridColumn: "1 / -1",
//               }}
//             >
//               <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{summary.overdueCount}</div>
//               <div style={{ fontSize: 16, opacity: 0.9 }}>Overdue</div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ========== UPDATED SECTION BELOW ========== */}
//       <div style={{ marginTop: 24 }}>
//         {Object.keys(groupedByProject).length === 0 ? (
//           <div style={{ color: "#999", textAlign: "center", padding: 40 }}>
//             No tasks in this category
//           </div>
//         ) : (
//           Object.entries(groupedByProject).map(([projectName, tasks]) => {
//             const projectId = tasks[0]?.projectId; // Extract project ID from first task

//             return (
//               <div
//                 key={projectName}
//                 onClick={() => projectId && navigate(`/project/${projectId}/checklist`)}
//                 onMouseEnter={() => setHoveredProject(projectName)}
//                 onMouseLeave={() => setHoveredProject(null)}
//                 style={{
//                   marginBottom: 24,
//                   cursor: projectId ? "pointer" : "default",
//                   padding: 12,
//                   borderRadius: 8,
//                   background: hoveredProject === projectName ? "#2d3748" : "transparent",
//                   transition: "all 0.2s",
//                 }}
//               >
//                 <h3
//                   style={{
//                     fontSize: 14,
//                     fontWeight: 600,
//                     color: hoveredProject === projectName ? "#fff" : "#aaa",
//                     marginBottom: 8,
//                     marginTop: 0,
//                     textTransform: "uppercase",
//                     letterSpacing: 1,
//                     transition: "all 0.2s",
//                   }}
//                 >
//                   {projectName}
//                 </h3>

//                 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//                   {tasks.map((task) => (
//                     <div
//                       key={task.id}
//                       onClick={(e) => e.stopPropagation()}
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 12,
//                         background: "#1f2937",
//                         padding: 12,
//                         borderRadius: 8,
//                         cursor: "pointer",
//                         transition: "all 0.2s",
//                         borderLeft: `4px solid ${URGENCY_COLORS[task.urgency]}`,
//                         opacity: task.completed ? 0.6 : 1,
//                       }}
//                       onClick={() => handleToggleTask(task)}
//                     >
//                       <input
//                         type="checkbox"
//                         checked={task.completed}
//                         onChange={(e) => {
//                           e.stopPropagation();
//                           handleToggleTask(task);
//                         }}
//                         style={{
//                           width: 20,
//                           height: 20,
//                           cursor: "pointer",
//                         }}
//                       />

//                       <div style={{ flex: 1 }}>
//                         <div
//                           style={{
//                             textDecoration: task.completed ? "line-through" : "none",
//                             fontSize: 14,
//                             fontWeight: 500,
//                           }}
//                         >
//                           {task.title}
//                         </div>
//                         {task.dueDate && (
//                           <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
//                             {formatDate(task.dueDate)}
//                           </div>
//                         )}
//                       </div>

//                       {task.flagged && (
//                         <div style={{ fontSize: 16 }}>🚩</div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// }


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
    return <div style={{ color: "#f5f5f5", padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ color: "#f5f5f5", maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h1 style={{ margin: "0 0 24px 0", fontSize: 32, fontWeight: 700 }}>Checklist Dashboard</h1>

      {error && (
        <div style={{ background: "#ff4444", color: "white", padding: 12, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {projects.map((project) => {
          const summary = summaries[project.id] || { allCount: 0, todayCount: 0, scheduledCount: 0, completedCount: 0, overdueCount: 0 };
          return (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/checklist`)}
              style={{
                background: "#1e40af",
                padding: 20,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                border: "2px solid transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            >
              <h3 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 600 }}>{project.name}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.todayCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Today</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.scheduledCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Scheduled</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.allCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>All</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.completedCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Completed</div>
                </div>
                {summary.overdueCount > 0 && (
                  <div style={{ textAlign: "center", gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f87171" }}>{summary.overdueCount}</div>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Overdue</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div style={{ color: "#999", textAlign: "center", padding: 40 }}>
          No projects found. Create a project to get started.
        </div>
      )}
    </div>
  );
}