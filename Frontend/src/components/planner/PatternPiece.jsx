export default function PatternPiece({ piece }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // this tells the browser what data we're dragging
        e.dataTransfer.setData("piece", JSON.stringify(piece));
      }}
      style={{
        background: piece.color,
        padding: "10px",
        borderRadius: "6px",
        cursor: "grab",
        color: "white",
        marginBottom: "10px",
      }}
    >
      {piece.name} ({piece.width}x{piece.height})
    </div>
  );
}
