export default function FabricHeader() {
  const marks = [];

  for (let i = 0; i <= 300; i += 12) {
    marks.push(i);
  }

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "8px 10px",
        borderBottom: "1px solid #e2e8f0",
        color: "#64748b",
        fontSize: "11px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          marginBottom: "4px",
          fontWeight: 600,
          color: "#94a3b8",
          fontSize: "10px",
          letterSpacing: "0.06em",
        }}
      >
        SELVAGE (Lengthwise Grain) →
      </div>

      <div style={{ display: "flex", gap: "40px" }}>
        {marks.map((m) => (
          <span key={m}>{m}"</span>
        ))}
      </div>
    </div>
  );
}
