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
  { value: "low", label: "Low", color: "#22c55e" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#ef4444" },
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

const CATEGORY_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

function getCategoryColor(category, allCategories) {
  const idx = allCategories.indexOf(category);
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

function TaskDetailPanel({ task, onUpdate, onDelete }) {
  const [localNotes, setLocalNotes] = useState(task.notes ?? "");
  const [localCategory, setLocalCategory] = useState(task.category ?? "");

  return (
    <div style={detailPanelStyle}>
      <label style={{ display: "grid", gap: 4, fontSize: "0.82rem" }}>
        <span style={{ color: "#64748b" }}>Notes</span>
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => onUpdate(task.id, { notes: localNotes })}
          placeholder="Write notes about this task..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <label style={{ display: "grid", gap: 4, fontSize: "0.82rem" }}>
        <span style={{ color: "#64748b" }}>Due Date & Time</span>
        <input
          type="datetime-local"
          value={task.dueDate ? task.dueDate.slice(0, 16) : ""}
          onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 4, fontSize: "0.82rem" }}>
        <span style={{ color: "#64748b" }}>Urgency</span>
        <select
          value={task.urgency}
          onChange={(e) => onUpdate(task.id, { urgency: e.target.value })}
          style={inputStyle}
        >
          {URGENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 4, fontSize: "0.82rem" }}>
        <span style={{ color: "#64748b" }}>Category</span>
        <input
          value={localCategory}
          onChange={(e) => setLocalCategory(e.target.value)}
          onBlur={() => onUpdate(task.id, { category: localCategory })}
          placeholder="e.g. Cutting, Sewing, Shopping..."
          style={inputStyle}
        />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => onUpdate(task.id, { flagged: !task.flagged })}
          style={{
            ...tinyBtnStyle,
            background: task.flagged ? "#fef3c7" : "#f1f5f9",
            color: task.flagged ? "#d97706" : "#64748b",
            border: task.flagged ? "1px solid #fcd34d" : "1px solid #e2e8f0",
            padding: "4px 10px",
          }}
        >
          🚩 {task.flagged ? "Flagged" : "Flag"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
          Created {task.createdAt ? new Date(task.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
        </span>
        <button type="button" onClick={() => onDelete(task)} style={deleteBtnStyle}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ChecklistPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
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

  const categories = useMemo(() => {
    const cats = new Set();
    tasks.forEach((t) => { if (t.category) cats.add(t.category); });
    return [...cats].sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!activeFilter) return tasks;
    return tasks.filter((t) => t.category === activeFilter);
  }, [tasks, activeFilter]);

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
    return (
      <div style={{ padding: "28px 32px", color: "#64748b", fontSize: "0.875rem" }}>
        Loading checklist...
      </div>
    );
  }

  return (
    <div style={{ color: "#1e293b", maxWidth: 800, padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, color: "#6d28d9" }}>☑</span>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>
            Task Checklist
          </h1>
        </div>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            background: "#ede9fe",
            color: "#6d28d9",
            borderRadius: "9999px",
            padding: "4px 14px",
          }}
        >
          {completedCount}/{tasks.length}
        </div>
      </div>

      <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "0.82rem" }}>
        {projectName}
      </p>

      {pageError && <div style={errorBoxStyle}>{pageError}</div>}

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              borderRadius: 99,
              background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Quick add input */}
      <form onSubmit={handleAddTask} style={{ marginBottom: 10 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task..."
          style={inputStyle}
        />
      </form>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          style={{
            ...pillStyle,
            background: !activeFilter ? "#ede9fe" : "#f1f5f9",
            color: !activeFilter ? "#6d28d9" : "#64748b",
            border: !activeFilter ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
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
                background: isActive ? catColor : "#f1f5f9",
                color: isActive ? "#fff" : catColor,
                border: `1px solid ${isActive ? catColor : "#e2e8f0"}`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Category assignment row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {newCategory && (
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Category: <strong style={{ color: "#6d28d9" }}>{newCategory}</strong>
            <button type="button" onClick={() => setNewCategory("")} style={tinyBtnStyle}>
              ✕
            </button>
          </span>
        )}
        {categories.length > 0 && !addingCategory && (
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: "0.78rem" }}
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
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
              placeholder="Category name"
              autoFocus
              style={{ ...inputStyle, width: 140, padding: "6px 10px", fontSize: "0.78rem" }}
            />
            <button type="button" onClick={handleAddCategory} style={tinyBtnStyle}>✓</button>
            <button type="button" onClick={() => { setAddingCategory(false); setCustomCategoryInput(""); }} style={tinyBtnStyle}>✕</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            style={{ ...pillStyle, background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}
          >
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
          padding: "11px",
          borderRadius: 10,
          border: "none",
          background: newTitle.trim()
            ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
            : "#e2e8f0",
          color: newTitle.trim() ? "#fff" : "#94a3b8",
          fontWeight: 700,
          fontSize: "0.875rem",
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
                <div style={{ width: 9, height: 9, borderRadius: 99, background: catColor }} />
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{cat}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "#f1f5f9",
                    color: "#64748b",
                    fontWeight: 600,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {catCompleted}/{catTasks.length}
                </span>
              </div>

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
                          borderLeft: overdue
                            ? "3px solid #ef4444"
                            : urgColor
                            ? `3px solid ${urgColor}`
                            : "3px solid #e2e8f0",
                          opacity: task.completed ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggle(task)}
                            style={{
                              width: 22,
                              height: 22,
                              minWidth: 22,
                              borderRadius: 99,
                              border: task.completed ? "2px solid #22c55e" : "2px solid #cbd5e1",
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
                            <div
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 500,
                                color: "#1e293b",
                                textDecoration: task.completed ? "line-through" : "none",
                              }}
                            >
                              {task.title}
                            </div>

                            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                              {task.urgency !== "none" && (
                                <span style={{ fontSize: "0.7rem", color: urgColor, fontWeight: 700 }}>
                                  {task.urgency === "high" ? "🔴" : task.urgency === "medium" ? "🟡" : "🟢"}{" "}
                                  {getUrgencyLabel(task.urgency)}
                                </span>
                              )}
                              {task.dueDate && (
                                <span style={{ fontSize: "0.7rem", color: overdue ? "#ef4444" : "#64748b" }}>
                                  📅 {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.flagged && (
                                <span style={{ fontSize: "0.7rem" }}>🚩</span>
                              )}
                              {task.autoSource === "inventory" && (
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    color: "#6366f1",
                                    background: "#ede9fe",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    border: "1px solid #c4b5fd",
                                  }}
                                >
                                  from inventory
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {expanded && (
                        <TaskDetailPanel
                          task={task}
                          onUpdate={handleUpdateTask}
                          onDelete={handleDeleteTask}
                        />
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
            <span style={{ fontSize: "0.875rem" }}>
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
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1e293b",
  boxSizing: "border-box",
  width: "100%",
  fontSize: "0.875rem",
  outline: "none",
};

const pillStyle = {
  padding: "5px 13px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
};

const taskCardStyle = {
  padding: "11px 14px",
  borderRadius: 10,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const detailPanelStyle = {
  display: "grid",
  gap: 12,
  padding: "14px 16px",
  marginTop: -1,
  borderRadius: "0 0 10px 10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderTop: "none",
};

const emptyStyle = {
  border: "2px dashed #cbd5e1",
  borderRadius: 12,
  padding: 28,
  background: "#f8fafc",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "0.875rem",
};

const errorBoxStyle = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#dc2626",
  fontSize: "0.875rem",
};

const tinyBtnStyle = {
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#64748b",
  cursor: "pointer",
  fontSize: "0.75rem",
  marginLeft: 6,
};

const deleteBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#ef4444",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontWeight: 500,
};

const suggestionBannerStyle = {
  marginTop: 24,
  padding: "14px 16px",
  borderRadius: 12,
  background: "#ede9fe",
  border: "1px solid #c4b5fd",
  color: "#5b21b6",
};

const addAllBtnStyle = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.8rem",
};
