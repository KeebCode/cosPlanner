export default function FabricStats() {
  return (
    <div style={{ marginTop: "16px" }}>
      <h2
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#1e293b",
          margin: "0 0 12px",
        }}
      >
        🪡 Fabric Required
      </h2>

      <div style={{ display: "flex", gap: "14px", marginBottom: "14px", flexWrap: "wrap" }}>
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "14px 20px",
            borderRadius: "10px",
            minWidth: "140px",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
            Yards
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e40af", lineHeight: 1 }}>0</div>
        </div>

        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "14px 20px",
            borderRadius: "10px",
            minWidth: "140px",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
            + Inches
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e40af", lineHeight: 1 }}>0"</div>
        </div>

        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "14px 20px",
            borderRadius: "10px",
            minWidth: "140px",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
            Efficiency
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#16a34a", lineHeight: 1 }}>0%</div>
        </div>
      </div>

      <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <span>Total Length: 0"</span>
        <span>Pattern Pieces: 0</span>
        <span>Total Pattern Area: 0 sq in</span>
      </div>
    </div>
  );
}
