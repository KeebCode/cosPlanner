import { useParams, useNavigate } from "react-router-dom";
export default function ProjectWorkSpace() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Project Workspace</h1>
      <p>Project ID: {id}</p>
      <div style={{ marginTop: "30px" }}>
        <button onClick={() => navigate("/project/${id}/planning")}>
          Garment Planning
        </button>

        <button onClick={() => navigate("/project/${id}/inventory")}>
          Inventory
        </button>

        <button onClick={() => navigate("/project/${id}/checklist")}>
          Checklist
        </button>
      </div>
    </div>
  );
}
