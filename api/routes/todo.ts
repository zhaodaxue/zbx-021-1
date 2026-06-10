import { Router } from 'express';
import { TodoController } from '../controllers/TodoController.js';

const router = Router();
const todoController = new TodoController();

router.get('/defrost', (req, res) => todoController.getDefrostTodos(req, res));
router.post('/defrost/:id/confirm', (req, res) => todoController.confirmDefrost(req, res));
router.get('/recovery', (req, res) => todoController.getRecoveryTodos(req, res));
router.post('/recovery/:id/confirm', (req, res) => todoController.confirmRecovery(req, res));

export default router;
