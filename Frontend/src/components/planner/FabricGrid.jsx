export default function FabricGrid() {
  const fabricWidth = 45;
  const rows = 120;
  const cols = fabricWidth;
  const cell = 20;

  return (
    <div style={{ position: "relative", background: "#ffffff", minHeight: "100%" }}>
      {/* Fabric width badge */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10,
          background: "#fefce8",
          border: "1px solid #ca8a04",
          borderRadius: "8px",
          padding: "5px 12px",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#92400e",
          pointerEvents: "none",
        }}
      >
        Fabric Width: {fabricWidth}"
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const data = e.dataTransfer.getData("piece");
            console.log("Dropped piece:", JSON.parse(data));
          }}
          style={{
            display: "grid",
            position: "relative",
            gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
            gridTemplateRows: `repeat(${rows}, ${cell}px)`,
            border: "2px solid #e2e8f0",
            width: cols * cell,
            background: "#ffffff",
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div
              key={i}
              style={{
                width: cell,
                height: cell,
                border: "1px solid #e2e8f0",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
