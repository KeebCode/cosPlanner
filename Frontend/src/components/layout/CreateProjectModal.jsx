import { useState } from "react";

export default function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          padding: "30px",
          borderRadius: "12px",
          width: "350px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          border: "1px solid #333",
        }}
      >
        <h2>Create New Project</h2>
        <input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "15px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{ padding: "8px 14px" }}>
            Cancel
          </button>

          <button
            onClick={async () => {
              if (!name.trim()) return;
              await onCreate(name.trim());
            }}
            style={{ padding: "8px 14px" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
