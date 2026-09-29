import type { Request, Response } from 'express';
import { Incident } from '../models/Incident.js';
import { buildMemoryQuery } from '../prompts/incidentAnalysisPrompt.js';
import { analyzeIncident as generateIncidentAnalysis } from '../services/openaiService.js';
import { recallSimilarIncidents, retainIncidentLearning } from '../services/hindsightService.js';
import { buildIncidentLearningMemory } from '../services/learningService.js';
import { incidentSeverities, type IncidentFeedback, type IncidentSeverity } from '../types/incident.js';

const requiredFields = ['title', 'service', 'environment', 'severity', 'error'] as const;

type CreateIncidentBody = Record<(typeof requiredFields)[number], unknown> & { logs?: unknown };

export async function createIncident(request: Request, response: Response): Promise<void> {
  const body = request.body as CreateIncidentBody;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const service = typeof body.service === 'string' ? body.service.trim() : '';
  const environment = typeof body.environment === 'string' ? body.environment.trim() : '';
  const severity = typeof body.severity === 'string' ? body.severity : '';
  const error = typeof body.error === 'string' ? body.error.trim() : '';
  const missingField = requiredFields.find((field) => !body[field] || (typeof body[field] === 'string' && body[field].trim() === ''));

  if (missingField) {
    response.status(400).json({ error: `Field '${missingField}' is required`, code: 'INVALID_INCIDENT' });
    return;
  }

  if (!incidentSeverities.includes(severity as IncidentSeverity)) {
    response.status(400).json({ error: 'Severity must be LOW, MEDIUM, HIGH, or CRITICAL', code: 'INVALID_INCIDENT' });
    return;
  }

  const incident = await Incident.create({
    title,
    service,
    environment,
    severity: severity as IncidentSeverity,
    error,
    logs: typeof body.logs === 'string' ? body.logs : '',
  });

  response.status(201).json({ incident });
}

export async function createDemoIncident(request: Request, response: Response): Promise<void> {
  const scenario = request.body?.scenario;
  const demo = scenario === 'redis'
    ? {
        title: 'Redis connection refused learning scenario',
        service: 'Notification Service',
        environment: 'Production',
        severity: 'HIGH' as const,
        error: 'ECONNREFUSED 10.0.3.12:6379',
        logs: 'Worker cannot reach the Redis endpoint.',
      }
    : scenario === 'mongodb'
      ? {
          title: 'MongoDB timeout learning scenario',
          service: 'Payment API',
          environment: 'Production',
          severity: 'CRITICAL' as const,
          error: 'MongoServerSelectionError: connection timed out',
          logs: 'Connection timeout while connecting to MongoDB.',
        }
      : null;

  if (!demo) {
    response.status(400).json({ error: "Scenario must be 'mongodb' or 'redis'", code: 'INVALID_DEMO_SCENARIO' });
    return;
  }

  const incident = await Incident.create(demo);
  response.status(201).json({ incident });
}

export async function listIncidents(_request: Request, response: Response): Promise<void> {
  const incidents = await Incident.find().sort({ createdAt: -1 }).lean();
  response.json({ incidents });
}

export async function getIncident(request: Request, response: Response): Promise<void> {
  const incident = await Incident.findOne({ id: request.params.id }).lean();

  if (!incident) {
    response.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
    return;
  }

  response.json({ incident });
}

export async function analyzeIncident(request: Request, response: Response): Promise<void> {
  const incident = await Incident.findOne({ id: request.params.id });

  if (!incident) {
    response.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
    return;
  }

  try {
    const memoryQuery = buildMemoryQuery(incident);
    const memoryResult = await recallSimilarIncidents(memoryQuery);
    const analysis = await generateIncidentAnalysis(incident, memoryResult.memories);

    incident.status = 'INVESTIGATING';
    incident.analysis = { ...analysis, memoryUsed: memoryResult.count > 0 };
    await incident.save();

    response.json({
      analysis: incident.analysis,
      memories: memoryResult.memories,
      memoryCount: memoryResult.count,
      incident,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'HINDSIGHT_UNAVAILABLE') {
      response.status(503).json({ error: 'Memory service temporarily unavailable', code: 'HINDSIGHT_UNAVAILABLE' });
      return;
    }

    if (error instanceof Error && (error.message === 'AI_UNAVAILABLE' || error.message === 'AI_INVALID_OUTPUT')) {
      response.status(503).json({ error: 'AI analysis service temporarily unavailable', code: error.message });
      return;
    }

    console.error('[INCIDENT] Analysis failed');
    response.status(503).json({ error: 'Incident analysis temporarily unavailable', code: 'ANALYSIS_UNAVAILABLE' });
  }
}

export async function submitFeedback(request: Request, response: Response): Promise<void> {
  const incident = await Incident.findOne({ id: request.params.id });
  if (!incident) {
    response.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
    return;
  }

  const body = request.body as Partial<Record<keyof IncidentFeedback, unknown>>;
  const outcome = body.outcome === 'SUCCESS' || body.outcome === 'FAILED' ? body.outcome : null;
  const attemptedAction = typeof body.attemptedAction === 'string' ? body.attemptedAction.trim() : '';
  const actualRootCause = typeof body.actualRootCause === 'string' ? body.actualRootCause.trim() : '';
  const successfulResolution = typeof body.successfulResolution === 'string' ? body.successfulResolution.trim() : '';
  const engineerFeedback = typeof body.engineerFeedback === 'string' ? body.engineerFeedback.trim() : '';

  if (!outcome || !attemptedAction || !actualRootCause || !successfulResolution || !engineerFeedback) {
    response.status(400).json({
      error: 'Outcome, attempted action, actual root cause, successful resolution, and engineer feedback are required',
      code: 'INVALID_FEEDBACK',
    });
    return;
  }

  const feedback: IncidentFeedback = {
    outcome,
    attemptedAction,
    actualRootCause,
    successfulResolution,
    engineerFeedback,
    createdAt: new Date(),
  };

  incident.feedback = feedback;
  incident.status = 'LEARNING';
  await incident.save();

  try {
    await retainIncidentLearning(buildIncidentLearningMemory(incident, feedback), {
      incidentId: incident.id,
      service: incident.service,
      outcome: feedback.outcome,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'HINDSIGHT_UNAVAILABLE') {
      response.status(503).json({ error: 'Memory service temporarily unavailable', code: 'HINDSIGHT_UNAVAILABLE' });
      return;
    }

    console.error('[LEARNING] Failed to retain incident learning');
    response.status(503).json({ error: 'Learning could not be saved', code: 'LEARNING_UNAVAILABLE' });
    return;
  }

  incident.status = 'RESOLVED';
  await incident.save();
  response.json({ incident, memoryUpdated: true });
}
