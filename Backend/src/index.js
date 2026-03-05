import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

//testing purposes
app.get('/api/test', (req, res) => {
    res.json({status: 'testing!'});
});

app.listen(port, () => {
    console.log(`Server is running.`);
})