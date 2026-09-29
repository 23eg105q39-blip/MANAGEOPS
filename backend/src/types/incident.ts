export const incidentSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof incidentSeverities)[number];

export const incidentStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'LEARNING'] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export interface IncidentAnalysis {
  summary: string;
  severityAssessment: string;
  likelyCauses: Array<{ cause: string; reason: string; confidence: number }>;
  historicalInsights: string[];
  recommendedActions: Array<{ step: number; action: string; reason: string; risk: string }>;
  failedApproachesToAvoid: string[];
  confidence: number;
  memoryUsed: boolean;
}

export interface IncidentFeedback {
  outcome: 'SUCCESS' | 'FAILED';
  attemptedAction: string;
  actualRootCause: string;
  successfulResolution: string;
  engineerFeedback: string;
  createdAt: Date;
}
