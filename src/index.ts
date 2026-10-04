import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDb } from './db/client.js';
import { AgentStateService } from './services/agentState.service.js';
import { SchedulerService } from './services/scheduler.service.js';

import agentRoutes from './routes/agent.routes.js';
import sourcesRoutes from './routes/sources.routes.js';
import filtersRoutes from './routes/filters.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import logsRoutes from './routes/logs.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/agent', agentRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/logs', logsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Instagram Job Alert Agent', timestamp: new Date() });
});

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('   BOOTSTRAPPING INSTAGRAM JOB ALERT AGENT');
  logger.info('=====================================================');

  // 1. Database Connection
  await connectDb();

  // 2. Initialize Agent State & AGENT_START_TIME (Requirements 3, 4, 5)
  const agentState = await AgentStateService.getOrCreateAgentState();
  logger.info(`[AGENT ENGINE] Status: ${agentState.status}`);

  // 3. Start Background Scheduler Loop
  if (agentState.status === 'RUNNING') {
    SchedulerService.startScheduler();
  } else {
    logger.warn(`[AGENT ENGINE] Scheduler not started because agent status is ${agentState.status}`);
  }

  // 4. Start HTTP Server
  app.listen(config.port, () => {
    logger.info(`[HTTP SERVER] Running on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap failure:', err);
  process.exit(1);
});
