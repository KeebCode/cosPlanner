import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/layout/ProjectCard";
import CreateProjectModal from "../components/layout/CreateProjectModal";
import { getProjects, createProject, deleteProject, updateProjectDescription } from "../services/api";
import { auth } from "../firebase";

function normalizeProject(project) {
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

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, description } : p))
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
    <div style={{ padding: "28px 32px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>
            Projects
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          + New Project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "48px",
            textAlign: "center",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>✂</div>
          <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
            No projects yet
          </div>
          <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Create your first cosplay project to get started.
          </div>
        </div>
      )}

      {/* Project grid */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={() => handleDeleteProject(project)}
            onDescriptionSave={handleDescriptionSave}
          />
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
            const newId = created?.costume_id ?? created?.cos_id;
            if (!newId) {
              alert("Project created but no ID returned. Cannot navigate to setup.");
              return;
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
