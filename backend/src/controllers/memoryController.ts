import type { Request, Response } from 'express';
import { recallSimilarIncidents } from '../services/hindsightService.js';

export async function recallMemory(request: Request, response: Response): Promise<void> {
  const query = typeof request.body?.query === 'string' ? request.body.query.trim() : '';

  if (!query) {
    response.status(400).json({ error: 'A memory query is required', code: 'INVALID_MEMORY_QUERY' });
    return;
  }

  try {
    const result = await recallSimilarIncidents(query);
    response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'HINDSIGHT_UNAVAILABLE') {
      response.status(503).json({ error: 'Memory service is not configured', code: 'HINDSIGHT_UNAVAILABLE' });
      return;
    }

    console.error('[HINDSIGHT] Recall failed');
    response.status(503).json({ error: 'Memory service temporarily unavailable', code: 'HINDSIGHT_UNAVAILABLE' });
  }
}
