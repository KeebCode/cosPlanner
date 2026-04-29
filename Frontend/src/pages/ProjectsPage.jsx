import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/layout/ProjectCard";
import CreateProjectModal from "../components/layout/CreateProjectModal";
import { getProjects, createProject,deleteProject, updateProjectDescription } from "../services/api";
import { auth } from "../firebase";

function normalizeProject(project) {
  // return {
  //   id: project.id ?? project.project_id ?? project.costume_id,
  //   name: project.name ?? project.project_name ?? project.costume_name,
  //   ...project,
  // };
    const rawName =
    project.name ?? project.project_name ?? project.costume_name ?? "";

  return {
    id: project.id ?? project.project_id ?? project.costume_id,
    name: String(rawName).trim() || "Untitled Project",
    ...project,
  };

}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();


  async function loadProjects() {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      const data = await getProjects(token);
      setProjects((data || []).map(normalizeProject));
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  async function handleDescriptionSave(projectId, description) {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      await updateProjectDescription(token, projectId, description);

      // update local state so UI reflects new description instantly
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, description } : p
        )
      );
    } catch (error) {
      console.error("Error saving description:", error);
    }
  }



  async function handleDeleteProject(project) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      await deleteProject(token, project.id);

      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Could not delete project. Please try again.");
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div>
      <h1>Projects</h1>

      <button
        onClick={() => setShowModal(true)}
        style={{ padding: "10px 20px", marginBottom: "20px", cursor: "pointer" }}
      >
        + New Project
      </button>

      <h3>Your Projects</h3>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} 
           onDelete={() => handleDeleteProject(project)}
           onDescriptionSave = {handleDescriptionSave} />
        ))}
      </div>

      {showModal && (
        <CreateProjectModal
  onClose={() => setShowModal(false)}
  onCreate={async (name) => {
    console.log("onCreate fired:", name);

    const firebaseUser = auth.currentUser;
    console.log("firebaseUser:", firebaseUser);

    if (!firebaseUser) {
      console.log("No firebase user, aborting create");
      return;
    }

    const token = await firebaseUser.getIdToken();
    console.log("token acquired");


    const created = await createProject(token, {
      project_name: name,
      description: "",
    });

    console.log("POST /api/projects finished");
    const newId= created?.costume_id ?? created?.cos_id;
    if(!newId){
      alert("Project created but no ID returned. Cannot navigate to setup.");
      return
    }
    console.log("loadProjects finished");

    setShowModal(false);

    navigate(`/project/${newId}/setup`);

  }}
/>
      )}
    </div>
  );
}
