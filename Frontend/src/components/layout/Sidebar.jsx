import { Link } from "react-router-dom";

export default function Sidebar(){
    return (
        <div style = {{width : "200px", background: "#eee", padding : "20px"}}>
            <h3>Menu</h3>

            <ul style = {{listStyle: "none", padding: 0}}>

                <li>
                    <Link to = "/projects">Projects</Link>
                </li>

                <li>
                <Link to = "/garment">Garment Planning</Link>
                </li>

                <li>
                <Link to = "/inventory">Inventory</Link>   
                </li>

                <li>
                <Link to = "/checklist">Checklist</Link>
                </li>    
         </ul>
     </div>
    );
}