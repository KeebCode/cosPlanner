import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import {
  getChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getInventorySuggestions,
  createChecklistFromInventory,
  getProjectById,
} from "../services/api";

const URGENCY_OPTIONS = [
  { value: "none", label: "None", color: null },
  { value: "low", label: "Low", color: "#34d399" },
  { value: "medium", label: "Medium", color: "#fbbf24" },
  { value: "high", label: "High", color: "#f87171" },
];

function getUrgencyColor(urgency) {
  const opt = URGENCY_OPTIONS.find((o) => o.value === urgency);
  return opt?.color || null;
}

function getUrgencyLabel(urgency) {
  const opt = URGENCY_OPTIONS.find((o) => o.value === urgency);
  return opt?.label || "None";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function normalizeTask(row) {
  return {
    id: row.checklist_id,
    title: row.checklist_title ?? "",
    notes: row.checklist_notes ?? "",
    completed: row.checklist_completed === 1,
    createdAt: row.checklist_created_at ?? "",
    dueDate: row.checklist_due_date ?? "",
    urgency: row.checklist_urgency ?? "none",
    category: row.checklist_category ?? "",
    flagged: row.checklist_flagged === 1,
    autoSource: row.checklist_auto_source ?? null,
    sourceId: row.checklist_source_id ?? null,
  };
}

// Color palette for category pills
const CATEGORY_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

function getCategoryColor(category, allCategories) {
  const idx = allCategories.indexOf(category);
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

export default function ChecklistPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeFilter, setActiveFilter] = useState(null); // null = all
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  async function getTokenOrRedirect() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      navigate("/login", { replace: true });
      return null;
    }
    return firebaseUser.getIdToken();
  }

  async function loadChecklist() {
    try {
      setLoading(true);
      setPageError("");

      const token = await getTokenOrRedirect();
      if (!token) return;

      const [rows, project, sug] = await Promise.all([
        getChecklist(token, id),
        getProjectById(token, id),
        getInventorySuggestions(token, id),
      ]);

      setTasks((rows || []).map(normalizeTask));
      setProjectName(
        project?.name ?? project?.project_name ?? project?.costume_name ?? "Untitled Project"
      );
      setSuggestions(sug || []);
    } catch (error) {
      console.error("Failed to load checklist", error);
      setPageError("Could not load checklist for this project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChecklist();
  }, [id]);

  // derive unique categories from tasks
  const categories = useMemo(() => {
    const cats = new Set();
    tasks.forEach((t) => { if (t.category) cats.add(t.category); });
    return [...cats].sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!activeFilter) return tasks;
    return tasks.filter((t) => t.category === activeFilter);
  }, [tasks, activeFilter]);

  // group tasks by category
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach((t) => {
      const cat = t.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  // ---- Actions ----

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await createChecklistItem(token, id, {
        title: newTitle.trim(),
        category: newCategory || null,
      });

      setNewTitle("");
      await loadChecklist();
    } catch (error) {
      console.error("Failed to add task", error);
    }
  }

  async function handleToggle(task) {
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await updateChecklistItem(token, task.id, { completed: !task.completed });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await updateChecklistItem(token, taskId, updates);
      await loadChecklist();
    } catch (error) {
      console.error("Failed to update task", error);
    }
  }

  async function handleDeleteTask(task) {
    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await deleteChecklistItem(token, task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (expandedTaskId === task.id) setExpandedTaskId(null);
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  }

  async function handleAddFromInventory() {
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await createChecklistFromInventory(token, id);
      await loadChecklist();
    } catch (error) {
      console.error("Failed to add from inventory", error);
    }
  }

  function handleAddCategory() {
    if (!customCategoryInput.trim()) return;
    setNewCategory(customCategoryInput.trim());
    setCustomCategoryInput("");
    setAddingCategory(false);
  }

  if (loading) {
    return <div style={{ color: "#f5f5f5" }}>Loading checklist...</div>;
  }

  return (
    <div style={{ color: "#f5f5f5", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>☑</span>
          <h1 style={{ margin: 0, fontSize: 24 }}>Task Checklist</h1>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.8 }}>
          {completedCount}/{tasks.length}
        </div>
      </div>

      <p style={{ margin: "0 0 14px 0", opacity: 0.6, fontSize: 13 }}>
        {projectName} | Project ID: {id}
      </p>

      {pageError && <div style={errorBoxStyle}>{pageError}</div>}

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "#333", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              borderRadius: 99,
              background: "#22c55e",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={handleAddTask} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task..."
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </form>

      {/* Category pills row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          style={{
            ...pillStyle,
            background: !activeFilter ? "#f5f5f5" : "#2a2a2a",
            color: !activeFilter ? "#111" : "#f5f5f5",
            border: !activeFilter ? "1px solid #f5f5f5" : "1px solid #444",
          }}
        >
          All
        </button>
        {categories.map((cat) => {
          const isActive = activeFilter === cat;
          const catColor = getCategoryColor(cat, categories);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : cat)}
              style={{
                ...pillStyle,
                background: isActive ? catColor : "#2a2a2a",
                color: isActive ? "#fff" : catColor,
                border: `1px solid ${isActive ? catColor : "#444"}`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* New category + category assignment for quick add */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {newCategory && (
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            New task category: <strong>{newCategory}</strong>
            <button type="button" onClick={() => setNewCategory("")} style={{ ...tinyBtnStyle, marginLeft: 6 }}>✕</button>
          </span>
        )}
        {categories.length > 0 && !addingCategory && (
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 12 }}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {addingCategory ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); }}}
              placeholder="Category name"
              autoFocus
              style={{ ...inputStyle, width: 140, padding: "6px 10px", fontSize: 12 }}
            />
            <button type="button" onClick={handleAddCategory} style={tinyBtnStyle}>✓</button>
            <button type="button" onClick={() => { setAddingCategory(false); setCustomCategoryInput(""); }} style={tinyBtnStyle}>✕</button>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingCategory(true)} style={{ ...pillStyle, background: "#2a2a2a", color: "#888", border: "1px solid #444", fontSize: 12 }}>
            + New Category
          </button>
        )}
      </div>

      {/* Add task button */}
      <button
        type="button"
        onClick={handleAddTask}
        disabled={!newTitle.trim()}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 10,
          border: "none",
          background: newTitle.trim() ? "#f5f5f5" : "#333",
          color: newTitle.trim() ? "#111" : "#888",
          fontWeight: 700,
          fontSize: 14,
          cursor: newTitle.trim() ? "pointer" : "default",
          marginBottom: 24,
        }}
      >
        + Add Task
      </button>

      {/* Task groups */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div style={emptyStyle}>No tasks yet. Add one above!</div>
      ) : (
        Object.entries(groupedTasks).map(([cat, catTasks]) => {
          const catCompleted = catTasks.filter((t) => t.completed).length;
          const catColor = getCategoryColor(cat, categories);

          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: catColor }} />
                <span style={{ fontWeight: 700, fontSize: 16 }}>{cat}</span>
                <span style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "#333",
                  color: "#ccc",
                  fontWeight: 600,
                }}>
                  {catCompleted}/{catTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div style={{ display: "grid", gap: 6 }}>
                {catTasks.map((task) => {
                  const expanded = expandedTaskId === task.id;
                  const overdue = !task.completed && isOverdue(task.dueDate);
                  const urgColor = getUrgencyColor(task.urgency);

                  return (
                    <div key={task.id}>
                      {/* Task row */}
                      <div
                        style={{
                          ...taskCardStyle,
                          borderLeft: overdue ? "3px solid #ef4444" : urgColor ? `3px solid ${urgColor}` : "3px solid transparent",
                          opacity: task.completed ? 0.55 : 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          {/* Checkbox circle */}
                          <button
                            type="button"
                            onClick={() => handleToggle(task)}
                            style={{
                              width: 22,
                              height: 22,
                              minWidth: 22,
                              borderRadius: 99,
                              border: task.completed ? "2px solid #22c55e" : "2px solid #555",
                              background: task.completed ? "#22c55e" : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 12,
                              marginTop: 2,
                              transition: "all 0.2s ease",
                            }}
                          >
                            {task.completed ? "✓" : ""}
                          </button>

                          {/* Task info */}
                          <div
                            style={{ flex: 1, cursor: "pointer" }}
                            onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                          >
                            <div style={{
                              fontSize: 15,
                              fontWeight: 500,
                              textDecoration: task.completed ? "line-through" : "none",
                            }}>
                              {task.title}
                            </div>

                            {/* Meta row */}
                            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                              {task.urgency !== "none" && (
                                <span style={{ fontSize: 11, color: urgColor, fontWeight: 700 }}>
                                  {task.urgency === "high" ? "🔴" : task.urgency === "medium" ? "🟡" : "🟢"} {getUrgencyLabel(task.urgency)}
                                </span>
                              )}
                              {task.dueDate && (
                                <span style={{ fontSize: 11, color: overdue ? "#ef4444" : "#aaa" }}>
                                  📅 {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.flagged && (
                                <span style={{ fontSize: 11, color: "#f59e0b" }}>🚩</span>
                              )}
                              {task.autoSource === "inventory" && (
                                <span style={{ fontSize: 10, color: "#6366f1", background: "#1e1b4b", padding: "1px 6px", borderRadius: 4 }}>
                                  from inventory
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {expanded && (
                        <div style={detailPanelStyle}>
                          {/* Notes */}
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            <span style={{ opacity: 0.7 }}>Notes</span>
                            <textarea
                              value={task.notes}
                              onChange={(e) =>
                                setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, notes: e.target.value } : t))
                              }
                              onBlur={() => handleUpdateTask(task.id, { notes: task.notes })}
                              placeholder="Write notes about this task..."
                              rows={3}
                              style={{ ...inputStyle, resize: "vertical" }}
                            />
                          </label>

                          {/* Due date */}
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            <span style={{ opacity: 0.7 }}>Due Date & Time</span>
                            <input
                              type="datetime-local"
                              value={task.dueDate ? task.dueDate.slice(0, 16) : ""}
                              onChange={(e) => handleUpdateTask(task.id, { dueDate: e.target.value || null })}
                              style={inputStyle}
                            />
                          </label>

                          {/* Urgency */}
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            <span style={{ opacity: 0.7 }}>Urgency</span>
                            <select
                              value={task.urgency}
                              onChange={(e) => handleUpdateTask(task.id, { urgency: e.target.value })}
                              style={inputStyle}
                            >
                              {URGENCY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </label>

                          {/* Category */}
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            <span style={{ opacity: 0.7 }}>Category</span>
                            <input
                              value={task.category}
                              onChange={(e) =>
                                setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, category: e.target.value } : t))
                              }
                              onBlur={() => handleUpdateTask(task.id, { category: task.category })}
                              placeholder="e.g. Cutting, Sewing, Shopping..."
                              style={inputStyle}
                            />
                          </label>

                          {/* Flag toggle */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateTask(task.id, { flagged: !task.flagged })}
                              style={{
                                ...tinyBtnStyle,
                                background: task.flagged ? "#f59e0b" : "#333",
                                color: task.flagged ? "#111" : "#aaa",
                                padding: "4px 10px",
                              }}
                            >
                              🚩 {task.flagged ? "Flagged" : "Flag"}
                            </button>
                          </div>

                          {/* Created at + Delete */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                            <span style={{ fontSize: 11, opacity: 0.5 }}>
                              Created {formatDateTime(task.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task)}
                              style={deleteBtnStyle}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Inventory suggestions banner */}
      {suggestions.length > 0 && (
        <div style={suggestionBannerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              💡 <strong>{suggestions.length}</strong> inventory item{suggestions.length > 1 ? "s" : ""} need purchasing
            </span>
            <button type="button" onClick={handleAddFromInventory} style={addAllBtnStyle}>
              + Add All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Styles ----

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1d1d1d",
  color: "#f5f5f5",
  boxSizing: "border-box",
  width: "100%",
  fontSize: 14,
};

const pillStyle = {
  padding: "6px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid #444",
};

const taskCardStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
};

const detailPanelStyle = {
  display: "grid",
  gap: 12,
  padding: "14px 16px",
  marginTop: -1,
  borderRadius: "0 0 10px 10px",
  background: "#151515",
  border: "1px solid #2a2a2a",
  borderTop: "none",
};

const emptyStyle = {
  border: "1px dashed #444",
  borderRadius: 12,
  padding: 24,
  background: "#141414",
  opacity: 0.85,
  textAlign: "center",
};

const errorBoxStyle = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #6a2d2d",
  background: "#2a1616",
  color: "#ffb3b3",
};

const tinyBtnStyle = {
  padding: "2px 8px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#333",
  color: "#f5f5f5",
  cursor: "pointer",
  fontSize: 12,
};

const deleteBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #5a2b2b",
  background: "#2b1717",
  color: "#ffb3b3",
  cursor: "pointer",
  fontSize: 12,
};

const suggestionBannerStyle = {
  marginTop: 24,
  padding: "14px 16px",
  borderRadius: 12,
  background: "#1b1535",
  border: "1px solid #3730a3",
  color: "#c7d2fe",
};

const addAllBtnStyle = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #6366f1",
  background: "#4f46e5",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};
