import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { Incident } from '../models/Incident.js';
import { buildIncidentLearningMemory } from '../services/learningService.js';
import { ensureHindsightBank, retainIncidentLearning } from '../services/hindsightService.js';
import type { IncidentFeedback, IncidentSeverity } from '../types/incident.js';

dotenv.config();

type SeedTemplate = {
  title: string;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  error: string;
  logs: string;
  feedback?: Omit<IncidentFeedback, 'createdAt'>;
};

const templates: SeedTemplate[] = [
  { title: 'MongoDB connection timeout', service: 'Payment API', environment: 'Production', severity: 'CRITICAL', error: 'MongoServerSelectionError: connection timed out', logs: 'Connection timeout while connecting to MongoDB.', feedback: { outcome: 'FAILED', attemptedAction: 'Increased the MongoDB connection pool', actualRootCause: 'Incorrect MONGO_URI environment variable', successfulResolution: 'Corrected MONGO_URI and restarted the service', engineerFeedback: 'Verify environment configuration before changing pool settings.' } },
  { title: 'MongoDB pool exhaustion', service: 'Orders API', environment: 'Production', severity: 'HIGH', error: 'MongoWaitQueueTimeoutError: timed out while checking out a connection', logs: 'Wait queue reached its configured limit.', feedback: { outcome: 'SUCCESS', attemptedAction: 'Reviewed pool sizing and active connection count', actualRootCause: 'Leaked cursors left connections checked out', successfulResolution: 'Closed cursors and deployed the query cleanup patch', engineerFeedback: 'Check active cursors before changing pool size.' } },
  { title: 'Redis connection refused', service: 'Notification Service', environment: 'Production', severity: 'HIGH', error: 'ECONNREFUSED 10.0.3.12:6379', logs: 'Worker cannot reach the Redis endpoint.', feedback: { outcome: 'FAILED', attemptedAction: 'Restarted the Redis service', actualRootCause: 'Firewall rule blocked port 6379', successfulResolution: 'Restored the network rule and verified connectivity', engineerFeedback: 'Check port 6379 and firewall access before restarting Redis.' } },
  { title: 'Redis credentials rejected', service: 'Session API', environment: 'Production', severity: 'HIGH', error: 'WRONGPASS invalid username-password pair', logs: 'All session workers began rejecting Redis authentication.', feedback: { outcome: 'SUCCESS', attemptedAction: 'Compared the deployed secret with the Redis ACL user', actualRootCause: 'Expired Redis credential remained in the deployment secret', successfulResolution: 'Rotated the secret and restarted workers', engineerFeedback: 'Validate credential age and ACL identity first.' } },
  { title: 'JWT validation failures', service: 'Authentication Service', environment: 'Production', severity: 'CRITICAL', error: 'JsonWebTokenError: jwt not active', logs: 'Authentication failures across multiple nodes.', feedback: { outcome: 'FAILED', attemptedAction: 'Rotated the JWT signing secret', actualRootCause: 'Clock drift between authentication servers', successfulResolution: 'Synchronized system time across auth nodes', engineerFeedback: 'Check time synchronization before rotating credentials.' } },
  { title: 'API gateway health checks failing', service: 'API Gateway', environment: 'Staging', severity: 'MEDIUM', error: 'upstream connect error or disconnect/reset before headers', logs: 'Gateway health checks fail after a route update.', feedback: { outcome: 'SUCCESS', attemptedAction: 'Compared the route target with the service port', actualRootCause: 'Health check targeted the old container port', successfulResolution: 'Updated the gateway route and redeployed configuration', engineerFeedback: 'Compare health-check ports after route changes.' } },
  { title: 'Deployment image pull failure', service: 'Checkout Worker', environment: 'Production', severity: 'HIGH', error: 'ImagePullBackOff: failed to pull image', logs: 'Registry returned manifest unknown for the release tag.' },
  { title: 'Missing environment variable', service: 'User Profile API', environment: 'Production', severity: 'HIGH', error: 'ConfigError: DATABASE_URL is required', logs: 'Container exits during configuration validation.' },
  { title: 'PostgreSQL deadlock spike', service: 'Billing API', environment: 'Production', severity: 'HIGH', error: 'deadlock detected', logs: 'Transaction retries increased after a bulk invoice job.' },
  { title: 'Node.js heap limit reached', service: 'Reporting API', environment: 'Production', severity: 'HIGH', error: 'FATAL ERROR: JavaScript heap out of memory', logs: 'Heap usage grows during large report exports.' },
  { title: 'Notification queue backlog', service: 'Notification Service', environment: 'Production', severity: 'MEDIUM', error: 'Queue processing lag exceeded 10 minutes', logs: 'Consumer throughput dropped after provider latency increased.' },
  { title: 'Docker health check loop', service: 'Catalog API', environment: 'Staging', severity: 'MEDIUM', error: 'container unhealthy', logs: 'Health endpoint returns 503 during application warm-up.' },
  { title: 'Kubernetes pod crash loop', service: 'Search API', environment: 'Production', severity: 'HIGH', error: 'CrashLoopBackOff', logs: 'Pod restarts after loading the search index.' },
  { title: 'Third-party payment timeout', service: 'Payment API', environment: 'Production', severity: 'CRITICAL', error: 'Payment provider request timed out', logs: 'Provider latency exceeded the client timeout.' },
  { title: 'Environment mismatch after deploy', service: 'Authentication Service', environment: 'Staging', severity: 'MEDIUM', error: 'Issuer does not match configured environment', logs: 'Staging pods received production issuer settings.' },
];

async function seed(): Promise<void> {
  const connected = await connectDatabase(process.env.MONGODB_URI);
  if (!connected) throw new Error('MongoDB is required to seed incidents');
  await ensureHindsightBank();

  let retained = 0;
  for (let round = 1; round <= 3; round += 1) {
    for (const [index, template] of templates.entries()) {
      const id = `DEMO-${String(round).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
      const feedback = template.feedback ? { ...template.feedback, createdAt: new Date() } : undefined;
      const status = feedback ? 'RESOLVED' : round === 1 ? 'OPEN' : 'INVESTIGATING';
      const incident = await Incident.findOneAndUpdate(
        { id },
        { $set: { ...template, id, status, feedback } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      if (feedback && incident) {
        await retainIncidentLearning(buildIncidentLearningMemory(incident, feedback), {
          incidentId: id,
          service: incident.service,
          outcome: feedback.outcome,
        });
        retained += 1;
      }
    }
  }

  console.log(`[SEED] Upserted ${templates.length * 3} incidents`);
  console.log(`[SEED] Retained ${retained} learning events in Hindsight`);
}

try {
  await seed();
} catch (error) {
  console.error('[SEED] Seed failed');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
