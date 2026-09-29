export interface HistoricalMemory {
  id: string;
  text: string;
  type: string;
  context: string | null;
  metadata: Record<string, string> | null;
  tags: string[] | null;
  scores: Record<string, number | null> | null;
}

export interface MemoryRecallResponse {
  memories: HistoricalMemory[];
  count: number;
}
