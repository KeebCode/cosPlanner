import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project, onDelete, onDescriptionSave }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [description, setDescription] = useState(project.description ?? project.costume_description ?? "");
  const [editing, setEditing] = useState(false);

  function handleDescriptionClick(e) {
    e.stopPropagation();
    setEditing(true);
  }

  function handleDescriptionBlur() {
    setEditing(false);
    onDescriptionSave?.(project.id, description);
  }

  return (
    <div
      onClick={() => navigate(`/project/${project.id}/planning`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 240,
        minHeight: 130,
        padding: 18,
        border: hovered ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
        borderRadius: 14,
        cursor: "pointer",
        background: "#ffffff",
        color: "#1e293b",
        boxShadow: hovered
          ? "0 4px 16px rgba(109,40,217,0.12)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Delete button */}
      {hovered && (
        <button
          type="button"
          aria-label={`Delete ${project.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid #fecaca",
            background: "#fff5f5",
            color: "#ef4444",
            cursor: "pointer",
            fontWeight: 700,
            padding: 0,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      )}

      {/* Project icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
            color: "white",
            flexShrink: 0,
          }}
        >
          ✂
        </div>
        <h4 style={{ margin: 0, color: "#1e293b", fontSize: "0.95rem", fontWeight: 600 }}>
          {project.name}
        </h4>
      </div>

      {/* Description */}
      {editing ? (
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Add a description..."
          style={{
            width: "100%",
            minHeight: 60,
            background: "#f8fafc",
            color: "#1e293b",
            border: "1px solid #c4b5fd",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <p
          onClick={handleDescriptionClick}
          style={{
            marginTop: 4,
            color: description ? "#64748b" : "#94a3b8",
            fontSize: 12,
            fontStyle: description ? "normal" : "italic",
            minHeight: 40,
            padding: "4px 6px",
            borderRadius: 6,
            border: "1px solid transparent",
            cursor: "text",
            margin: 0,
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            e.currentTarget.style.border = "1px solid #e2e8f0";
            e.currentTarget.style.background = "#f8fafc";
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            e.currentTarget.style.border = "1px solid transparent";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {description || "Add a description..."}
        </p>
      )}
    </div>
  );
}
