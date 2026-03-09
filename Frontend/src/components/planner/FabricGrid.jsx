export default function FabricGrid() {
  const fabricWidth = 45; // width of fabric in inches
  const rows = 120; // simulate length of fabric
  const cols = fabricWidth;
  const cell = 20;

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ overflowX: "auto" }}>
        <div
          onDragOver={(e) => e.preventDefault()} // allow dropping
          onDrop={(e) => {
            const data = e.dataTransfer.getData("piece");
            console.log("Dropped piece:", JSON.parse(data));
          }}
          style={{
            display: "grid",
            position: "relative",
            gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
            gridTemplateRows: `repeat(${rows}, ${cell}px)`,
            border: "2px solid #444",
            width: cols * cell,
            background: "#0f0f0f",
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div
              key={i}
              style={{
                width: cell,
                height: cell,
                border: "1px solid #333",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
