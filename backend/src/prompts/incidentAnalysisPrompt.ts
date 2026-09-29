export function buildMemoryQuery(incident: {
  service: string;
  environment: string;
  severity: string;
  error: string;
  logs: string;
}): string {
  return [
    `Find historical incidents similar to this ${incident.environment} ${incident.severity} incident in ${incident.service}.`,
    `Error: ${incident.error}`,
    `Logs: ${incident.logs}`,
    'Focus on previous root causes, attempted solutions, failed approaches, successful resolutions, and engineer lessons.',
  ].join(' ');
}
