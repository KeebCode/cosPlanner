export default function PatternPiece({ piece }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("piece", JSON.stringify(piece));
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 10px",
        borderRadius: "6px",
        cursor: "grab",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        marginBottom: "6px",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: "1rem", color: "#94a3b8" }}>☐</span>
      <span style={{ color: "#1e293b", fontSize: "0.875rem" }}>
        {piece.name}{" "}
        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
          ({piece.width}" &times; {piece.height}")
        </span>
      </span>
    </div>
  );
}
