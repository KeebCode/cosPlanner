import { useParams } from "react-router-dom";
import FabricGrid from "../components/planner/FabricGrid";
import FabricStats from "../components/planner/FabricStats";
import PieceLibrary from "../components/planner/PieceLibrary";
import FabricHeader from "../components/planner/FabricHeader";
export default function GarmentPlanningPage() {
  // grabbing the project ID from the URL
  const { id } = useParams();

  return (
    <div>
      {/* showing which project we're inside */}
      <h1>Garment Planning</h1>

      {/* useful for debugging */}
      <p>Project ID: {id}</p>
      <div style={{
        marginTop:"20px",
        padding: "10px",
        border: "1px solid #444",
        width:"200px",
        background : "#161616"
      }}
      >
        Fabric Width :45"

      </div>
      <PieceLibrary/>
      <FabricHeader/>
      <FabricGrid/>
      <FabricStats/>
    </div>
  );
}
