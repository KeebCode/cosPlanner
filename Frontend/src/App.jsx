import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import Layout from "./components/layout/Layout";

import ProjectsPage from "./pages/ProjectsPage";
import GarmentsPlanningPage from "./pages/GarmentPlanningPage";
import InventoryPage from "./pages/InventoryPage";
import ChecklistPage from "./pages/ChecklistPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path = "/" element = {<Layout />}>
                    <Route index element = {<Navigate to ="/projects" replace />}/>
                    <Route path = "/projects" element = {<ProjectsPage />} />
                    <Route path = "/garment" element = {< GarmentsPlanningPage/>} />
                    <Route path = "/inventory" element = {< InventoryPage/>} />
                    <Route path = "/checklist" element = {< ChecklistPage/>} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
