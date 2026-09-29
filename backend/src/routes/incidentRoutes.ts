import { Router } from 'express';
import { analyzeIncident, createDemoIncident, createIncident, getIncident, listIncidents, submitFeedback } from '../controllers/incidentController.js';

export const incidentRoutes = Router();

incidentRoutes.post('/', createIncident);
incidentRoutes.post('/demo', createDemoIncident);
incidentRoutes.get('/', listIncidents);
incidentRoutes.post('/:id/analyze', analyzeIncident);
incidentRoutes.post('/:id/feedback', submitFeedback);
incidentRoutes.get('/:id', getIncident);
