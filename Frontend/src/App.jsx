import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";

import ProjectsPage from "./pages/ProjectsPage";
import GarmentPlanningPage from "./pages/GarmentPlanningPage";
import InventoryPage from "./pages/InventoryPage";
import ChecklistPage from "./pages/ChecklistPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* layout wrapper */}
        <Route path="/" element={<Layout />}>
          {/* projects homepage */}
          <Route index element={<ProjectsPage />} />

          {/* project workspace pages */}
          <Route
            path="project/:id/planning"
            element={<GarmentPlanningPage />}
          />

          <Route path="project/:id/inventory" element={<InventoryPage />} />

          <Route path="project/:id/checklist" element={<ChecklistPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
