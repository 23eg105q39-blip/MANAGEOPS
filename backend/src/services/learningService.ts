import type { IncidentDocument } from '../models/Incident.js';
import type { IncidentFeedback } from '../types/incident.js';

export function buildIncidentLearningMemory(incident: IncidentDocument, feedback: IncidentFeedback): string {
  const failedApproach = feedback.outcome === 'FAILED'
    ? `The attempted troubleshooting action failed: ${feedback.attemptedAction}.`
    : `The attempted troubleshooting action succeeded: ${feedback.attemptedAction}.`;

  return [
    `Incident ${incident.id} occurred in the ${incident.environment} environment for the ${incident.service}.`,
    `Incident symptoms: ${incident.error}`,
    incident.logs ? `Relevant logs: ${incident.logs}` : '',
    incident.analysis?.summary ? `Initial AI diagnosis: ${incident.analysis.summary}` : '',
    failedApproach,
    `Actual root cause: ${feedback.actualRootCause}.`,
    `Successful resolution: ${feedback.successfulResolution}.`,
    `Engineer feedback: ${feedback.engineerFeedback}.`,
    feedback.outcome === 'FAILED'
      ? 'Lesson learned: this failed troubleshooting pattern should not be blindly repeated for similar incidents. Verify the actual evidence and consider the successful resolution first.'
      : 'Lesson learned: this successful troubleshooting pattern may be useful for similar incidents, but current evidence must still be checked.',
  ].filter(Boolean).join('\n\n');
}
