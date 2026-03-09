export default function CreateProjectModal({ onClose, onCreate }) {
  //uses onClose and onCreate
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        zIndex: 9999, //sits above the page
      }}
    >
      {/*modal box */}
      <div
        style={{
          background: "#1e1e1e",
          padding: "30px",
          borderRadius: "12px",
          width: "350px",

          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          border: "1px solid #333",
        }}
      >
        <h2>Create New Project</h2>
        <input
          type="text"
          placeholder="Project name"
          id="projectInput"
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "15px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "1px solid #444",
            background: "#111",
            color: "white",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {/*cancel button*/}
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              background: "#333",
              border: "none",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          {/*Create button*/}
          <button
            onClick={() => {
              const name = document.getElementById("projectInput").value;

              //checking for empty projects
              if (name.trim() === "") return;
              onCreate(name); //send name back to parent
              onClose(); // close modal
            }}
            style={{
                padding:"8px 14px",
                background:"#3b82f6",
                border:"none",
                borderRadius:"6px",
                color:"white",
                cursor: "pointer"
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
