import { useParams } from "react-router-dom";

export default function ChecklistPage() {
  const { id } = useParams();

  return (
    <div>
      <h1>Checklist</h1>
      <p>Project ID: {id}</p>
    </div>
  );
}
