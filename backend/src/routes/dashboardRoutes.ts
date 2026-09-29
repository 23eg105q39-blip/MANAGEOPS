import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', getDashboardStats);
