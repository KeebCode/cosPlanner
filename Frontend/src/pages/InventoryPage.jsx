import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
      cardBorder: "1px solid #1f7a3d",
      cardBackground: "#102617",
      textColor: "#7cff9e",
      badgeBackground: "#16351f",
      badgeBorder: "1px solid #24532f",
    };
  }

  if (status === "low_on_stock") {
    return {
      cardBorder: "1px solid #a37a12",
      cardBackground: "#2b220b",
      textColor: "#ffd54a",
      badgeBackground: "#3a2c0d",
      badgeBorder: "1px solid #7a5d14",
    };
  }

  return {
    cardBorder: "1px solid #7a2323",
    cardBackground: "#2a1111",
    textColor: "#ff8f8f",
    badgeBackground: "#341414",
    badgeBorder: "1px solid #5c2121",
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
      size: form.size ? Number(form.size) : null,  // ✅ FIXED: Convert to number
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
    return <div>Loading inventory...</div>;
  }

  return (
    <div style={{ color: "#f5f5f5" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Inventory</h1>
            <p style={{ margin: 0, opacity: 0.75 }}>
              {projectName || "Project"} | Project ID: {id}
            </p>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.8 }}>
              Select Project
            </label>
            <select
              value={String(id)}
              onChange={handleProjectChange}
              style={selectStyle}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" onClick={openAddModal} style={addButtonStyle}>
          + Add Item
        </button>
      </div>

      {pageError && <div style={errorBoxStyle}>{pageError}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={summaryCardStyle}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Total Cost</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {formatCurrency(totalCost)}
          </div>
        </div>

        <div style={summaryCardStyle}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Owned Progress</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {ownedCount} / {items.length}
          </div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{progressPercent}%</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Need To Buy</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {items.length - ownedCount}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
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
              padding: "8px 14px",
              borderRadius: 999,
              border:
                filter === tab.value
                  ? "1px solid #f5f5f5"
                  : "1px solid #444",
              background: filter === tab.value ? "#f5f5f5" : "#1b1b1b",
              color: filter === tab.value ? "#111" : "#f5f5f5",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div style={emptyStateStyle}>No inventory items yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredItems.map((entry) => {
            const statusStyles = getStatusStyles(entry.status);
            const statusLabel = getStatusLabel(entry.status);

            return (
              <div
                key={entry.itemId}
                style={{
                  ...itemCardStyle,
                  border: statusStyles.cardBorder,
                  background: statusStyles.cardBackground,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {entry.name}
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.9 }}>
                      {entry.quantity} {entry.quantityUnit} |{" "}
                      {formatCurrency(entry.cost)} |{" "}
                      <span
                        style={{
                          color: statusStyles.textColor,
                          fontWeight: 700,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    {(entry.size || entry.color) && (
                      <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                        {entry.size ? `Size: ${entry.size}` : ""}
                        {entry.size && entry.color ? " | " : ""}
                        {entry.color ? `Color: ${entry.color}` : ""}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      ...categoryTagStyle,
                      border: statusStyles.badgeBorder,
                      background: statusStyles.badgeBackground,
                      color: statusStyles.textColor,
                    }}
                  >
                    {entry.category || "other"}
                  </div>
                </div>

                {entry.location ? (
                  <div style={{ marginTop: 10, opacity: 0.72, fontSize: 13 }}>
                    Location: {entry.location}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(entry)}
                    style={editButtonStyle}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    style={deleteButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddModal || editingItem) && (
        <div onClick={closeModal} style={modalOverlayStyle}>
          <div
            onClick={(event) => event.stopPropagation()}
            style={modalCardStyle}
          >
            <h2 style={{ marginTop: 0 }}>
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
  minWidth: 260,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #444",
  background: "#1d1d1d",
  color: "#f5f5f5",
};

const addButtonStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #444",
  background: "#f5f5f5",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

const errorBoxStyle = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #6a2d2d",
  background: "#2a1616",
  color: "#ffb3b3",
};

const summaryCardStyle = {
  border: "1px solid #343434",
  borderRadius: 12,
  padding: 14,
  background: "#161616",
};

const emptyStateStyle = {
  border: "1px dashed #444",
  borderRadius: 12,
  padding: 24,
  background: "#141414",
  opacity: 0.85,
};

const itemCardStyle = {
  border: "1px solid #333",
  borderRadius: 14,
  padding: 16,
  background: "#171717",
};

const categoryTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #444",
  background: "#202020",
  fontSize: 12,
  textTransform: "capitalize",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.65)",
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
  border: "1px solid #333",
  background: "#121212",
  color: "#f5f5f5",
  padding: 20,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1d1d1d",
  color: "#f5f5f5",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #f5f5f5",
  background: "#f5f5f5",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1c1c1c",
  color: "#f5f5f5",
  cursor: "pointer",
};

const editButtonStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#252525",
  color: "#f5f5f5",
  cursor: "pointer",
};

const deleteButtonStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #5a2b2b",
  background: "#2b1717",
  color: "#ffb3b3",
  cursor: "pointer",
};
