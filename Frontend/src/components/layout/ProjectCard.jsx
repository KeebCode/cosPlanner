import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const ICONS = [
  "✂", "🎭", "👗", "🧵", "🎨", "🦸", "🧙", "👑",
  "🌟", "🎀", "🛡️", "⚔️", "🪄", "🎬", "🧶", "🎪",
  "🦋", "💎", "🌸", "🎯", "🐉", "🦊", "🌙", "🔮",
];

function getStoredIcon(projectId) {
  return localStorage.getItem(`project-icon-${projectId}`) || "✂";
}

const isImage = (val) => typeof val === "string" && val.startsWith("data:");

export default function ProjectCard({ project, onDelete, onDescriptionSave }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [description, setDescription] = useState(project.description ?? project.costume_description ?? "");
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(() => getStoredIcon(project.id));
  const [showPicker, setShowPicker] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
        setUploadError("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPicker]);

  function handleIconClick(e) {
    e.stopPropagation();
    setShowPicker((v) => !v);
    setUploadError("");
  }

  function pickIcon(e, emoji) {
    e.stopPropagation();
    localStorage.setItem(`project-icon-${project.id}`, emoji);
    setIcon(emoji);
    setShowPicker(false);
  }

  function handleUploadClick(e) {
    e.stopPropagation();
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setUploadError("Image must be under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      try {
        localStorage.setItem(`project-icon-${project.id}`, dataUrl);
        setIcon(dataUrl);
        setShowPicker(false);
        setUploadError("");
      } catch {
        setUploadError("Image too large to store. Try a smaller file.");
      }
    };
    reader.readAsDataURL(file);
  }

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
        {/* Clickable icon */}
        <div style={{ position: "relative" }} ref={pickerRef}>
          <div
            onClick={handleIconClick}
            title="Change icon"
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
              cursor: "pointer",
              userSelect: "none",
              overflow: "hidden",
            }}
          >
            {isImage(icon)
              ? <img src={icon} alt="icon" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : icon
            }
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Picker popover */}
          {showPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 38,
                left: 0,
                zIndex: 100,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                padding: 10,
                width: 204,
              }}
            >
              {/* Section label */}
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  paddingBottom: 6,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                Pick an icon
              </div>

              {/* Emoji grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 8 }}>
                {ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => pickIcon(e, emoji)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: (!isImage(icon) && emoji === icon) ? "2px solid #7c3aed" : "1px solid transparent",
                      background: (!isImage(icon) && emoji === icon) ? "#ede9fe" : "transparent",
                      fontSize: "1rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (isImage(icon) || emoji !== icon) e.currentTarget.style.background = "#f5f3ff";
                    }}
                    onMouseLeave={(e) => {
                      if (isImage(icon) || emoji !== icon) e.currentTarget.style.background = (!isImage(icon) && emoji === icon) ? "#ede9fe" : "transparent";
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 8 }} />

              {/* Upload button */}
              <button
                onClick={handleUploadClick}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px dashed #c4b5fd",
                  background: isImage(icon) ? "#ede9fe" : "#faf5ff",
                  color: "#7c3aed",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#ede9fe"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isImage(icon) ? "#ede9fe" : "#faf5ff"; }}
              >
                <span style={{ fontSize: "1rem" }}>🖼️</span>
                {isImage(icon) ? "Change image" : "Upload image"}
              </button>

              {/* Upload error */}
              {uploadError && (
                <div style={{ marginTop: 6, fontSize: "0.72rem", color: "#ef4444", textAlign: "center" }}>
                  {uploadError}
                </div>
              )}
            </div>
          )}
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
