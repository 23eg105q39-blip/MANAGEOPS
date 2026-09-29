import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDatabase, isDatabaseReady } from './config/database.js';
import { incidentRoutes } from './routes/incidentRoutes.js';
import { memoryRoutes } from './routes/memoryRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { ensureHindsightBank, isHindsightConfigured } from './services/hindsightService.js';
import { isAIConfigured } from './services/openaiService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/incidents', incidentRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    services: {
      database: isDatabaseReady(),
      hindsight: isHindsightConfigured(),
      ai: isAIConfigured(),
    },
  });
});

async function startServer(): Promise<void> {
  await connectDatabase(process.env.MONGODB_URI);
  await ensureHindsightBank();
  app.listen(port, () => {
    console.log(`[SERVER] MemoryOps API listening on http://localhost:${port}`);
  });
}

void startServer();
