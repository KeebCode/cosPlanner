import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { auth } from "../firebase";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  getProjectById,
  getProjects,
  updateInventoryItem,
} from "../services/api";

const EMPTY_FORM = {
  name: "",
  category: "fabric",
  customCategory: "",
  quantity: "1",
  quantityUnit: "",
  cost: "",
  status: "need_to_buy",
  location: "",
  size: "",
  color: "",
};

const CATEGORY_OPTIONS = [
  { value: "fabric", label: "Fabric" },
  { value: "thread", label: "Thread" },
  { value: "foam", label: "Foam" },
  { value: "accessories", label: "Accessories" },
  { value: "tools", label: "Tools" },
  { value: "other", label: "Other" },
];

const BUILT_IN_CATEGORIES = new Set(
  CATEGORY_OPTIONS.map((option) => option.value),
);

const STATUS_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "need_to_buy", label: "Need to Buy" },
  { value: "low_on_stock", label: "Low on Stock" },
];

function normalizeProject(project) {
  const projectId = project.id ?? project.project_id ?? project.costume_id;
  const rawName =
    project.name ?? project.project_name ?? project.costume_name ?? "";

  return {
    ...project,
    id: projectId,
    name: String(rawName).trim() || "Untitled Project",
  };
}

function normalizeInventoryItem(row) {
  return {
    itemId: row.item_id ?? row.itemId,
    inventoryId: row.inventory_id ?? row.inventoryId,
    projectId: row.project_id ?? row.projectId,
    name: row.name ?? row.item_name ?? "",
    category: row.category ?? row.item_category ?? "other",
    size: row.size ?? row.item_size ?? "",
    color: row.color ?? row.item_color ?? "",
    quantity:
      row.quantity ?? row.inventory_quantity ?? row.inventoryQuantity ?? 0,
    quantityUnit:
      row.quantityUnit ??
      row.inventory_quantity_item ??
      row.inventoryQuantityItem ??
      "",
    cost: Number(row.cost ?? row.inventory_total_cost ?? 0),
    status: row.status ?? row.inventory_status ?? "need_to_buy",
    location: row.location ?? row.inventory_location ?? "",
    updatedAt: row.updatedAt ?? row.inventory_update ?? null,
  };
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getStatusStyles(status) {
  if (status === "owned") {
    return {
      cardBorderLeft: "3px solid #22c55e",
      textColor: "#16a34a",
      badgeBackground: "#dcfce7",
      badgeColor: "#16a34a",
      badgeBorder: "1px solid #bbf7d0",
    };
  }

  if (status === "low_on_stock") {
    return {
      cardBorderLeft: "3px solid #f59e0b",
      textColor: "#d97706",
      badgeBackground: "#fef3c7",
      badgeColor: "#d97706",
      badgeBorder: "1px solid #fde68a",
    };
  }

  return {
    cardBorderLeft: "3px solid #ef4444",
    textColor: "#dc2626",
    badgeBackground: "#fef2f2",
    badgeColor: "#dc2626",
    badgeBorder: "1px solid #fecaca",
  };
}

function getStatusLabel(status) {
  if (status === "owned") return "Owned";
  if (status === "low_on_stock") return "Low on Stock";
  return "Need to Buy";
}

export default function InventoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function getTokenOrRedirect() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      navigate("/login", { replace: true });
      return null;
    }

    return firebaseUser.getIdToken();
  }

  async function loadInventoryPage() {
    try {
      setLoading(true);
      setPageError("");

      const token = await getTokenOrRedirect();
      if (!token) return;

      const [projectList, project, inventoryRows] = await Promise.all([
        getProjects(token),
        getProjectById(token, id),
        getInventoryItems(token, id),
      ]);

      setProjects((projectList || []).map(normalizeProject));
      setProjectName(
        project?.name ??
          project?.project_name ??
          project?.costume_name ??
          "Untitled Project",
      );
      setItems((inventoryRows || []).map(normalizeInventoryItem));
    } catch (error) {
      console.error("Failed to load inventory page", error);
      setPageError("Could not load inventory for this project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventoryPage();
  }, [id]);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      openAddModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  function handleProjectChange(event) {
    const nextProjectId = event.target.value;
    if (!nextProjectId || String(nextProjectId) === String(id)) return;

    navigate(`/project/${nextProjectId}/inventory`);
  }

  function openAddModal() {
    setForm(EMPTY_FORM);
    setEditingItem(null);
    setShowAddModal(true);
    setSaveState("idle");
  }

  function openEditModal(item) {
    const normalizedCategory = String(item.category ?? "other").toLowerCase();
    const isBuiltInCategory = BUILT_IN_CATEGORIES.has(normalizedCategory);

    setForm({
      name: item.name ?? "",
      category: isBuiltInCategory ? normalizedCategory : "other",
      customCategory: isBuiltInCategory ? "" : item.category ?? "",
      quantity: String(item.quantity ?? ""),
      quantityUnit: item.quantityUnit ?? "",
      cost: String(item.cost ?? ""),
      status: item.status ?? "need_to_buy",
      location: item.location ?? "",
      size: item.size ?? "",
      color: item.color ?? "",
    });

    setEditingItem(item);
    setShowAddModal(false);
    setSaveState("idle");
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSaveState("idle");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaveState("saving");

      const token = await getTokenOrRedirect();
      if (!token) return;

      const resolvedCategory =
        form.category === "other"
          ? form.customCategory.trim()
          : form.category.trim();

      if (!resolvedCategory) {
        setSaveState("error");
        return;
      }

      const payload = {
      name: form.name.trim(),
      category: resolvedCategory,
      quantity: Number(form.quantity),
      quantityUnit: form.quantityUnit.trim(),
      cost: Number(form.cost),
      status: form.status,
      location: form.location.trim(),
      size: form.size ? Number(form.size) : null,
      color: form.color.trim(),
    };

      if (editingItem) {
        await updateInventoryItem(token, editingItem.itemId, payload);
      } else {
        await createInventoryItem(token, id, payload);
      }

      await loadInventoryPage();
      closeModal();
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to save inventory item", error);
      setSaveState("error");
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Delete "${item.name}" from this project inventory?`,
    );
    if (!confirmed) return;

    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      await deleteInventoryItem(token, item.itemId);
      setItems((prev) => prev.filter((entry) => entry.itemId !== item.itemId));
    } catch (error) {
      console.error("Failed to delete inventory item", error);
      alert("Could not delete the inventory item.");
    }
  }

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  const totalCost = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    [items],
  );

  const ownedCount = useMemo(
    () => items.filter((item) => item.status === "owned").length,
    [items],
  );

  const progressPercent = items.length
    ? Math.round((ownedCount / items.length) * 100)
    : 0;

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? form.category === "other" && !form.customCategory.trim()
          ? "Custom category is required"
          : "Save failed"
        : "";

  if (loading) {
    return <div style={{ padding: "28px 32px", color: "#64748b", fontSize: "0.875rem" }}>Loading inventory...</div>;
  }

  return (
    <div style={{ color: "#1e293b", padding: "28px 32px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, color: "#6d28d9" }}>📦</span>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>Inventory</h1>
        </div>
        <button type="button" onClick={openAddModal} style={addButtonStyle}>
          + Add Item
        </button>
      </div>

      <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "0.82rem" }}>{projectName || "Project"}</p>

      {/* Project selector */}
      <div style={{ marginBottom: 20 }}>
        <select value={String(id)} onChange={handleProjectChange} style={selectStyle}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      {pageError && <div style={errorBoxStyle}>{pageError}</div>}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={summaryCardStyle}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Total Cost</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: "#1e293b" }}>{formatCurrency(totalCost)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Owned Progress</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: "#1e293b" }}>{ownedCount} / {items.length}</div>
          <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{progressPercent}%</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Need To Buy</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: "#1e293b" }}>{items.length - ownedCount}</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { value: "all", label: "All" },
          { value: "owned", label: "Owned" },
          { value: "need_to_buy", label: "Need to Buy" },
          { value: "low_on_stock", label: "Low on Stock" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: filter === tab.value ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
              background: filter === tab.value ? "#ede9fe" : "#f1f5f9",
              color: filter === tab.value ? "#6d28d9" : "#64748b",
              fontWeight: filter === tab.value ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.82rem",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item list */}
      {filteredItems.length === 0 ? (
        <div style={emptyStateStyle}>No inventory items yet. Add one above!</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredItems.map((entry) => {
            const statusStyles = getStatusStyles(entry.status);
            const statusLabel = getStatusLabel(entry.status);

            return (
              <div
                key={entry.itemId}
                style={{
                  ...itemCardStyle,
                  borderLeft: statusStyles.cardBorderLeft,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{entry.name}</div>
                    <div style={{ marginTop: 6, fontSize: "0.875rem", color: "#475569" }}>
                      {entry.quantity} {entry.quantityUnit} · {formatCurrency(entry.cost)} ·{" "}
                      <span style={{ color: statusStyles.textColor, fontWeight: 600 }}>{statusLabel}</span>
                    </div>
                    {(entry.size || entry.color) && (
                      <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#64748b" }}>
                        {entry.size ? `Size: ${entry.size}` : ""}
                        {entry.size && entry.color ? " · " : ""}
                        {entry.color ? `Color: ${entry.color}` : ""}
                      </div>
                    )}
                    {entry.location && (
                      <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#94a3b8" }}>📍 {entry.location}</div>
                    )}
                  </div>

                  <span style={{
                    ...categoryTagStyle,
                    background: statusStyles.badgeBackground,
                    color: statusStyles.badgeColor,
                    border: statusStyles.badgeBorder,
                  }}>
                    {entry.category || "other"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => openEditModal(entry)} style={editButtonStyle}>Edit</button>
                  <button type="button" onClick={() => handleDelete(entry)} style={deleteButtonStyle}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddModal || editingItem) && (
        <div onClick={closeModal} style={modalOverlayStyle}>
          <div onClick={(event) => event.stopPropagation()} style={modalCardStyle}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>
              {editingItem ? "Edit Item" : "Add Item"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Name</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Red Fabric"
                    required
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Category</span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    style={inputStyle}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {form.category === "other" && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Custom Category</span>
                    <input
                      name="customCategory"
                      value={form.customCategory}
                      onChange={handleFormChange}
                      placeholder="Worbla, Resin, Paint, etc."
                      required
                      style={inputStyle}
                    />
                  </label>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Quantity</span>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.quantity}
                      onChange={handleFormChange}
                      required
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Quantity Unit</span>
                    <input
                      name="quantityUnit"
                      value={form.quantityUnit}
                      onChange={handleFormChange}
                      placeholder="yards"
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Cost</span>
                    <input
                      name="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost}
                      onChange={handleFormChange}
                      placeholder="20"
                      required
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Status</span>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      style={inputStyle}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Size</span>
                    <input
                      name="size"
                      value={form.size}
                      onChange={handleFormChange}
                      placeholder="34, 35, 36, etc."
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Color</span>
                    <input
                      name="color"
                      value={form.color}
                      onChange={handleFormChange}
                      placeholder="Red, Blue, etc."
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Location</span>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    placeholder="Optional"
                    style={inputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minHeight: 20, opacity: 0.8 }}>{saveLabel}</div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>

                  <button type="submit" style={primaryButtonStyle}>
                    {editingItem ? "Save Changes" : "Add Item"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  minWidth: 220,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: "0.875rem",
};

const addButtonStyle = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
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

const summaryCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "16px 20px",
  background: "#ffffff",
};

const emptyStateStyle = {
  border: "2px dashed #cbd5e1",
  borderRadius: 12,
  padding: 28,
  background: "#f8fafc",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "0.875rem",
};

const itemCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "16px 20px",
  background: "#ffffff",
};

const categoryTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "capitalize",
  flexShrink: 0,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#1e293b",
  padding: 24,
  maxHeight: "90vh",
  overflowY: "auto",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#1e293b",
  boxSizing: "border-box",
  fontSize: "0.875rem",
};

const primaryButtonStyle = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const secondaryButtonStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#64748b",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const editButtonStyle = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#475569",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 500,
};

const deleteButtonStyle = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#ef4444",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 500,
};
