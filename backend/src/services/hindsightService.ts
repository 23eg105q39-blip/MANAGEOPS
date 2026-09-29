import { HindsightClient, HindsightError } from '@vectorize-io/hindsight-client';
import type { HistoricalMemory, MemoryRecallResponse } from '../types/memory.js';

let hindsightClient: HindsightClient | null = null;

function getBankId(): string {
  return process.env.HINDSIGHT_BANK_ID ?? 'memoryops-incidents';
}

export function isHindsightConfigured(): boolean {
  return Boolean(process.env.HINDSIGHT_BASE_URL && process.env.HINDSIGHT_API_KEY && getBankId());
}

export function initializeHindsightClient(): HindsightClient | null {
  if (!isHindsightConfigured()) {
    console.log('[HINDSIGHT] Hindsight credentials are not configured');
    return null;
  }

  if (!hindsightClient) {
    hindsightClient = new HindsightClient({
      baseUrl: process.env.HINDSIGHT_BASE_URL as string,
      apiKey: process.env.HINDSIGHT_API_KEY as string,
      userAgent: 'memoryops-ai/0.1.0',
    });
  }

  return hindsightClient;
}

export async function ensureHindsightBank(): Promise<boolean> {
  const client = initializeHindsightClient();
  if (!client) {
    return false;
  }

  try {
    await client.createBank(getBankId(), {
      name: 'MemoryOps Incidents',
      reflectMission: 'Help incident responders learn from previous production incidents, failed troubleshooting attempts, successful resolutions, and engineer feedback.',
    });
    console.log(`[HINDSIGHT] Bank ready: ${getBankId()}`);
    return true;
  } catch (error) {
    logHindsightFailure('bank provisioning', error);
    return false;
  }
}

export async function recallSimilarIncidents(query: string): Promise<MemoryRecallResponse> {
  const client = initializeHindsightClient();
  if (!client) {
    throw new Error('HINDSIGHT_UNAVAILABLE');
  }

  let response;
  try {
    response = await client.recall(getBankId(), query, {
      types: ['world', 'experience', 'observation'],
      preferObservations: true,
      maxTokens: 2500,
      budget: 'mid',
    });
  } catch (error) {
    logHindsightFailure('recall', error);
    throw error;
  }

  const memories: HistoricalMemory[] = response.results.map((result) => ({
    id: result.id,
    text: result.text,
    type: result.type ?? 'unknown',
    context: result.context ?? null,
    metadata: result.metadata ?? null,
    tags: result.tags ?? null,
    scores: result.scores ?? null,
  }));

  console.log(`[HINDSIGHT] ${memories.length} memories recalled`);
  return { memories, count: memories.length };
}

export async function retainIncidentLearning(
  content: string,
  metadata: Record<string, string>,
): Promise<void> {
  const client = initializeHindsightClient();
  if (!client) {
    throw new Error('HINDSIGHT_UNAVAILABLE');
  }

  try {
    await client.retain(getBankId(), content, {
      context: 'incident response learning',
      metadata,
      documentId: metadata.incidentId,
      tags: ['incident-response'],
      async: false,
    });
  } catch (error) {
    logHindsightFailure('retain', error);
    throw error;
  }

  console.log(`[HINDSIGHT] Learning retained for ${metadata.incidentId}`);
}

function logHindsightFailure(operation: string, error: unknown): void {
  const status = error instanceof HindsightError ? error.statusCode ?? 'unknown' : 'unknown';
  console.error(`[HINDSIGHT] ${operation} failed (status: ${status})`);
}
