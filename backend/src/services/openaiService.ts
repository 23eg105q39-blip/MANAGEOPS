import GroqCompatibleClient from 'openai';
import type { IncidentAnalysis } from '../types/incident.js';
import type { HistoricalMemory } from '../types/memory.js';

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    severityAssessment: { type: 'string' },
    likelyCauses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cause: { type: 'string' },
          reason: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['cause', 'reason', 'confidence'],
      },
    },
    historicalInsights: { type: 'array', items: { type: 'string' } },
    recommendedActions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          step: { type: 'number' },
          action: { type: 'string' },
          reason: { type: 'string' },
          risk: { type: 'string' },
        },
        required: ['step', 'action', 'reason', 'risk'],
      },
    },
    failedApproachesToAvoid: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number' },
    memoryUsed: { type: 'boolean' },
  },
  required: [
    'summary',
    'severityAssessment',
    'likelyCauses',
    'historicalInsights',
    'recommendedActions',
    'failedApproachesToAvoid',
    'confidence',
    'memoryUsed',
  ],
} as const;

let groqClient: GroqCompatibleClient | null = null;

export function isAIConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

function getGroqClient(): GroqCompatibleClient {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('AI_UNAVAILABLE');
  }

  groqClient ??= new GroqCompatibleClient({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 45_000,
    maxRetries: 1,
  });
  return groqClient;
}

export async function analyzeIncident(
  incident: {
    id: string;
    title: string;
    service: string;
    environment: string;
    severity: string;
    error: string;
    logs: string;
  },
  memories: HistoricalMemory[],
): Promise<IncidentAnalysis> {
  const client = getGroqClient();
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  let response;
  try {
    response = await client.responses.create({
      model,
      instructions: [
        'You are MemoryOps, an advisory incident-response analyst for software engineering teams.',
        'Use the current incident as primary evidence. Historical Hindsight memories are supporting evidence, not absolute truth.',
        'Distinguish observed facts from inference. Do not claim certainty when evidence is incomplete.',
        'Do not recommend repeating a failed approach from historical memory unless you explain why the current evidence differs.',
        'Recommend investigation steps only. Never claim that you accessed production systems or executed an action.',
        'Return only the requested JSON object.',
      ].join(' '),
      input: JSON.stringify({
        currentIncident: incident,
        historicalMemories: memories,
      }),
      text: {
        format: {
          type: 'json_schema',
          name: 'incident_analysis',
          strict: true,
          schema: analysisSchema,
        },
      },
    });
  } catch (error) {
    const status = error instanceof GroqCompatibleClient.APIError ? error.status ?? 'unknown' : 'unknown';
    const code = error instanceof GroqCompatibleClient.APIError ? error.code ?? 'unknown' : 'unknown';
    const type = error instanceof GroqCompatibleClient.APIError ? error.type ?? 'unknown' : 'unknown';
    const message = error instanceof GroqCompatibleClient.APIError ? error.message.split('\n')[0].slice(0, 180) : 'unknown';
    console.error(`[GROQ] Analysis failed (status: ${status}, code: ${code}, type: ${type}, message: ${message})`);
    throw error;
  }

  if (!response.output_text) {
    throw new Error('AI_INVALID_OUTPUT');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch (_error) {
    throw new Error('AI_INVALID_OUTPUT');
  }

  if (!isIncidentAnalysis(parsed)) {
    throw new Error('AI_INVALID_OUTPUT');
  }

  return parsed;
}

function isIncidentAnalysis(value: unknown): value is IncidentAnalysis {
  if (!value || typeof value !== 'object') return false;
  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis.summary === 'string' &&
    typeof analysis.severityAssessment === 'string' &&
    Array.isArray(analysis.likelyCauses) &&
    Array.isArray(analysis.historicalInsights) &&
    Array.isArray(analysis.recommendedActions) &&
    Array.isArray(analysis.failedApproachesToAvoid) &&
    typeof analysis.confidence === 'number' &&
    typeof analysis.memoryUsed === 'boolean'
  );
}
