//testing purposes as of right now, please DOUBLE CHECK 
// require('dotenv').config(); 
// const express = require('express');
// const cors = require('cors');
// const app = express(); 

// app.use(cors());
// app.use(express.json());

// const materialRoutes = require('./routes/materials');
// const costumeRoutes = require('./routes/costumes');
// const agentRoutes = require('./routes/agent');

// app.use('/api/materials', materialRoutes);
// app.use('/api/costumes', costumeRoutes);
// app.use('/api/agent', agentRoutes);

// const Port = process.env.Port || 5000; 
// app.listen(port, () => { 
//     console.log('It is running!');
// });

//another way to do it 
const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes.js');
const { database } = require('../src/Database/connection');
const { messages, costumes } = require('../src/Database/schema');
const app = express();

//connects frontend and backend, allows for cross-origin requests; 
//cors forces the browser to check if the frontend is allowed to talk to the backend
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.1:3000']
}))

app.use((req, res, next) => {
    console.log(req.method, req.path);
    next();
});

app.use(express.json()); //allows us to parse JSON bodies in requests, aka POST routes
app.use('/api/routes', productRoutes); //uses routes.js for routing

app.get('/api/costumes', async (req, res) => {
    try {
        const costumes = await database.select().from(costumes);
        res.json(costumes);
    } catch (error){
        console.error('error', error);
        res.status(500).json({error: 'failed'});
    }    
});

app.listen(3000, () => {
    console.log('server is running');
});

// app.get('/', (req, res) => {
//     res.send('TESTING');
// });

// app.get('/projectID', (req, res) => {
//     res.json([
//         {id: 1, name: 'test', price: 0},
//         {id: 2, name: 'test2', price: 0},
//         {id: 3, name: 'test3', price: 0}
//     ]);
// });

// app.get('/products/:id', (req, res) => {
//     const id = Number(req.params.id);
//     const products = [
//         {id: 1, name: 'test', price: 0}
//         //{}
//     ]
//     const requestedProduct = products.find((product) => product.id === id);
//     res.json(requestedProduct);
// });

// app.get('/', (req, res) => {
//     res.json({message: "testing"});
// });

// //POST route (send form data to the backend)
// app.post('/', async (req, res) => {
//     try {
//         const {message} = req.body;

//         //store the data in the database
//         const result = await database.insert(messages).values({message: message});
//         res.json({success: true, id: result.insertId});
//     }catch (error) {
//         res.status(500).json({success: false, error: error.message});
//     }
// });
