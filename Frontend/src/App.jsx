import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";
import RequireAuth from "./components/auth/RequireAuth";
import { AuthProvider } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import GarmentPlanningPage from "./pages/GarmentPlanningPage";
import ProjectSetupPage from "./pages/ProjectSetupPage";
import InventoryPage from "./pages/InventoryPage";
import ChecklistPage from "./pages/ChecklistPage"; // new
import ChecklistDashboard from "./pages/ChecklistDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<ProjectsPage />} />
            <Route path="checklist" element={<ChecklistDashboard />} />
            <Route path="project/:id/setup" element={<ProjectSetupPage />} />
            <Route
              path="project/:id/planning"
              element={<GarmentPlanningPage />}
            />
            <Route path="project/:id/inventory" element={<InventoryPage />} />
            <Route path="project/:id/checklist" element={<ChecklistPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
