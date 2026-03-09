import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
      }}
    >
      {/* sidebar */}
      <div
        style={{
          width: "250px",
          background: "#e5e5e5",
          padding: "20px",
        }}
      >
        <h3>Menu</h3>

        <a href="/">Projects</a>
        <br />

        <a href="/project/1/planning">Garment Planning</a>
        <br />

        <a href="/project/1/inventory">Inventory</a>
        <br />

        <a href="/project/1/checklist">Checklist</a>
      </div>

      {/* main content */}
      <div
        style={{
          flex: 1,
          height: "100%",
          padding: "40px",
          background: "#1e1e1e",
          color: "white",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
