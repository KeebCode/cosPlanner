import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import { Outlet } from "react-router-dom";
export default function Layout(){
    return (
        <div>
            <Navbar />
             
             <div style = {{ display: "flex"}}>
                <Sidebar />

                <main style = {{ padding: "20px", flex: 1}}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}