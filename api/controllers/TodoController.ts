import { Request, Response } from 'express';
import { TodoService } from '../services/TodoService.js';

export class TodoController {
  private todoService: TodoService;

  constructor() {
    this.todoService = new TodoService();
  }

  async getDefrostTodos(req: Request, res: Response): Promise<void> {
    try {
      const todos = await this.todoService.getDefrostTodos();
      res.json({ success: true, data: todos });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async confirmDefrost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.todoService.confirmDefrost(Number(id));
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async getRecoveryTodos(req: Request, res: Response): Promise<void> {
    try {
      const todos = await this.todoService.getRecoveryTodos();
      res.json({ success: true, data: todos });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async confirmRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.todoService.confirmRecovery(Number(id));
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }
}
