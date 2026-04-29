// import { useNavigate } from "react-router-dom";
// export default function ProjectCard({ name }) {
//     const navigate = useNavigate();
//     //this component is one card and we pass the project name into as a prop
//   return (
//     <div
//       onClick={()=> navigate('/project/${project.id}')}
//       style={{
//         border: "1px solid #444",
//         padding: "20px",
//         borderRadius: "12px",
//         width: "200px",
//         background: "#1e1e1e",
//         cursor: "pointer",
//         //transition : "transform 0.2s, box-shadow 0.2s"// this is for a hover animation
//       }}
//       // when mouse hovers the project boxes it hovers too
//     //   onMouseEnter={(e)=> {
//     //     e.currentTarget.style.transform = "translateY(-5px)";
//     //     e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.3)";

//     //   }}
//     //   onMouseLeave={(e)=> {
//     //     e.currentTarget.style.transform= "translateY(0)";
//     //     e.currentTarget.style.bowShadow= "none";
//     //   }}
//     >
//       <h3>{project.name}</h3>
//     </div>
//   );
// }
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project, onDelete, onDescriptionSave }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [description, setDescription] = useState(project.description ?? project.costume_description ?? "");
  const [editing, setEditing] = useState(false);

  function handleDescriptionClick(e) {
    e.stopPropagation(); // prevent card navigation
    setEditing(true);
  }

  function handleDescriptionBlur() {
    setEditing(false);
    onDescriptionSave?.(project.id, description); // save on click away
  }

  return (
    <div
      onClick={() => navigate(`/project/${project.id}/planning`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 240,
        minHeight: 130,
        padding: 16,
        border: "1px solid #2f2f2f",
        borderRadius: 12,
        cursor: "pointer",
        background: "#1e1e1e",
        color: "#f5f5f5",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      {hovered && (
        <button
          type="button"
          aria-label={`Delete ${project.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid #555",
            background: "#2a2a2a",
            color: "#ff6b6b",
            cursor: "pointer",
            fontWeight: 700,
            padding: 0,
            fontSize: 16,
          }}
        >
          ×
        </button>
      )}

      <h4 style={{ margin: "0 0 8px 0", color: "#f5f5f5" }}>{project.name}</h4>

      {editing ? (
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Add a description..."
          style={{
            width: "100%",
            minHeight: 60,
            background: "#2a2a2a",
            color: "#f5f5f5",
            border: "1px solid #555",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <p
          onClick={handleDescriptionClick}
          style={{
            marginTop: 4,
            color: description ? "#bdbdbd" : "#666",
            fontSize: 12,
            fontStyle: description ? "normal" : "italic",
            minHeight: 40,
            padding: "4px 6px",
            borderRadius: 6,
            border: "1px solid transparent",
            cursor: "text",
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            e.currentTarget.style.border = "1px solid #444";
            e.currentTarget.style.background = "#2a2a2a";
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            e.currentTarget.style.border = "1px solid transparent";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {description || "Add a description..."}
        </p>
      )}
    </div>
  );
}
