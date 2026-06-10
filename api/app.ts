import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import gunsRouter from './routes/guns.js';
import todoRouter from './routes/todo.js';
import { GunController } from './controllers/GunController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const gunController = new GunController();

app.use(cors());
app.use(express.json());

app.use('/api/guns', gunsRouter);
app.use('/api/todo', todoRouter);
app.post('/api/sensor-records', (req, res) => gunController.reportSensorData(req, res));

const distPath = path.join(__dirname, '..', '..');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
