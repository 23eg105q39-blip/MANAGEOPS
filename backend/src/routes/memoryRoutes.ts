import { Router } from 'express';
import { recallMemory } from '../controllers/memoryController.js';

export const memoryRoutes = Router();

memoryRoutes.post('/recall', recallMemory);
