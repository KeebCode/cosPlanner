import PatternPiece from "./PatternPiece";

export default function PieceLibrary() {
  const pieces = [
    { name: "Sleeve", width: 12, height: 18, color: "#3b82f6" },
    { name: "Collar", width: 4, height: 20, color: "#10b981" },
    { name: "Pocket", width: 6, height: 6, color: "#f97316" },
  ];

  return (
    <div style={{ marginBottom: "20px" }}>
      <h2>Pattern Pieces</h2>

      {pieces.map((piece, index) => (
        <PatternPiece key={index} piece={piece} />
      ))}
    </div>
  );
}
