export default function FabricHeader() {
  const marks = [];

  for (let i = 0; i <= 300; i += 12) {
    marks.push(i);
  }

  return (
    <div
      style={{
        background: "#d9d9d9",
        padding: "10px",
        border: "1px solid #aaa",
        color: "#333",
      }}
    >
      <div style={{ marginBottom: "5px" }}>SELVAGE (Lengthwise Grain) →</div>

      <div style={{ display: "flex", gap: "40px", fontSize: "12px" }}>
        {marks.map((m) => (
          <span key={m}>{m}"</span>
        ))}
      </div>
    </div>
  );
}
