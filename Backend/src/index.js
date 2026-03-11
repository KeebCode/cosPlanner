import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { database } from './connection.js';
import { costumes } from './schema.js';

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
const PORT = process.env.port || 3000;

//testing purposes
app.get('/api/health', (req, res) => {
    res.json({status: 'Healthy!'});
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});