import { useState } from "react";
import ProjectCard from "../components/layout/ProjectCard";
import CreateProjectModal from "../components/layout/CreateProjectModal";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([
    { id: 1, name: "Batman Suit " },
    { id: 2, name: "Spider-Man Suit",},
    { id: 3, name: "Zelda Suit", }
  ]);
  const [nextId,setNextID]= useState(4);
  // const [newProject, setNewProject] = useState("");

  //controlling wheter model is visible or not
  const [showModal, setShowModal] = useState(false);
  return (
    <div>
      <h1>Projects</h1>
      <div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px",
            marginBottom: "20px",
            cursor: "pointer",
          }}
        >
          + New Project
        </button>
      </div>

      <div>
        <h3>Your Projects</h3>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={(name) => {
            setProjects([...projects, name]);
          }}
        />
      )}
    </div>
  );
}
// export default function ProjectsPage() {
//   return (
//     <div>
//       <h1>Projects Page Working</h1>
//     </div>
//   );
// }