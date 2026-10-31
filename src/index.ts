import cors from 'cors';
import express, { Request, Response } from 'express';
import adminRoutes from './routes/adminRoutes';

const app = express();
app.use(cors());
app.use(express.json()); 

const PORT = process.env.PORT || 5000;
app.use('/api/admin', adminRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the TAM-VIT Admin Portal Backend!');
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});