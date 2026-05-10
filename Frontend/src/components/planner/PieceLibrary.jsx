import PatternPiece from "./PatternPiece";

export default function PieceLibrary() {
  const pieces = [
    { name: "Sleeve", width: 12, height: 18, color: "#3b82f6" },
    { name: "Collar", width: 4, height: 20, color: "#10b981" },
    { name: "Pocket", width: 6, height: 6, color: "#f97316" },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span>✂</span>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
          Pattern Tools
        </span>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Fabric Width */}
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #ca8a04",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.85rem" }}>📏</span>
            <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#78350f" }}>
              Fabric Width (inches)
            </span>
          </div>
          <input
            readOnly
            value="45"
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #d97706",
              borderRadius: "6px",
              background: "#fffbeb",
              color: "#92400e",
              fontSize: "0.88rem",
              boxSizing: "border-box",
              marginBottom: "10px",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["36", "45", "54", "60"].map((w) => (
              <button
                key={w}
                style={{
                  padding: "4px 10px",
                  border: "1px solid #d97706",
                  borderRadius: "6px",
                  background: w === "45" ? "#d97706" : "transparent",
                  color: w === "45" ? "white" : "#92400e",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                }}
              >
                {w}"
              </button>
            ))}
          </div>
        </div>

        {/* Quick Add Pattern Pieces */}
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#475569", marginBottom: "8px" }}>
            Quick Add Pattern Pieces
          </div>
          {pieces.map((piece, index) => (
            <PatternPiece key={index} piece={piece} />
          ))}
        </div>

        {/* Custom Pattern Piece */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#1d4ed8", marginBottom: "10px" }}>
            + Custom Pattern Piece
          </div>
          <input
            placeholder="Name"
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #93c5fd",
              borderRadius: "6px",
              background: "#eff6ff",
              color: "#1e40af",
              fontSize: "0.82rem",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
