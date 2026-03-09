export default function FabricStats(){
    return(
        <div style = {{marginTop:"30px"}}>
            <h2>Fabric Required</h2>
            <div style ={{display:"flex",gap:"20px", marginTop:"10px"}}>
                <div style={{
                    background: "#d9e6ff",
                    padding:"20px",
                    borderRadius:"10px",
                    width:"200px"
                }}
                >
                    <h3>Yards</h3>
                    <p style={{fontSize:"30px"}}>0</p>
                </div>
                <div style={{
                    background: "#d9e6ff",
                    padding:"20px",
                    borderRadius:"10px",
                    width: "200px"
                }}
                >
                    <h3>+ Inches</h3>
                    <p style={{fontSize:"30px"}}>0</p>
                </div>
                <div style={{
                    background:"#d9ffe3",
                    padding:"20px",
                    borderRadius:"10px",
                    width:"200px"
                }}
                >
                    <h3>Efficiency</h3>
                    <p style = {{fontSize: "30px"}}>0%</p>

                </div>
            </div>
            <div style={{marginTop:"20px"}}>
                <p>Total Length : 0"</p>
                <p>Pattern Pieces: 0</p>
                <p>Total Pattern Area : 0 sq in</p>

            </div>
        </div>
    )
}