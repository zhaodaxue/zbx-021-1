import { Router } from 'express';
import { GunController } from '../controllers/GunController.js';

const router = Router();
const gunController = new GunController();

router.get('/', (req, res) => gunController.getAllGuns(req, res));
router.get('/:id', (req, res) => gunController.getGunById(req, res));
router.get('/:id/sensor-records', (req, res) => gunController.getSensorRecords(req, res));
router.get('/:id/shutdown-records', (req, res) => gunController.getShutdownRecords(req, res));
router.post('/sensor-records', (req, res) => gunController.reportSensorData(req, res));

export default router;
