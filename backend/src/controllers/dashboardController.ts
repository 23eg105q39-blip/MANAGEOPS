import type { Request, Response } from 'express';
import { Incident } from '../models/Incident.js';

export async function getDashboardStats(_request: Request, response: Response): Promise<void> {
  const [totalIncidents, openIncidents, resolvedIncidents, learningEvents, failedApproaches, successfulResolutions] = await Promise.all([
    Incident.countDocuments(),
    Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING', 'LEARNING'] } }),
    Incident.countDocuments({ status: 'RESOLVED' }),
    Incident.countDocuments({ feedback: { $exists: true } }),
    Incident.countDocuments({ 'feedback.outcome': 'FAILED' }),
    Incident.countDocuments({ 'feedback.outcome': 'SUCCESS' }),
  ]);

  response.json({
    totalIncidents,
    openIncidents,
    resolvedIncidents,
    learningEvents,
    failedApproaches,
    successfulResolutions,
  });
}
