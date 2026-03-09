import { useParams } from "react-router-dom";

export default function InventoryPage() {
  const { id } = useParams();

  return (
    <div>
      <h1>Inventory</h1>
      <p>Project ID: {id}</p>
    </div>
  );
}
