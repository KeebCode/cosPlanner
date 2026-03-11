const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working" }); //testing purposes, can be removed later
});

app.get("/api/projects", (req, res) => {
  res.json([
    { id: 1, name: "Gojo Cosplay" },
    { id: 2, name: "Batman Suit" }
  ]);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
