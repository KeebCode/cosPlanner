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
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/project/${project.id}/planning`)}
      style={{
        border: "1px solid #444",
        padding: "20px",
        borderRadius: "10px",
        width: "200px",
        cursor: "pointer",
        background: "#1e1e1e",
      }}
    >
      {/* show project name */}
      <h3>{project.name}</h3>
    </div>
  );
}