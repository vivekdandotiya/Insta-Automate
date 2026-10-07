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

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Global HTTP Request Logger (PART 3 - Traces whether request reaches Express)
app.use((req, res, next) => {
  logger.info(`[HTTP] ${req.method} ${req.originalUrl || req.url}`);
  next();
});

// API Routes
app.use('/api/agent', agentRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/logs', logsRoutes);

// Health check endpoints (Requirement 6, 17 & 24)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Instagram Job Search Engine', timestamp: new Date() });
});

app.get('/api/instagram/health', async (req, res) => {
  try {
    const healthResult = await SchedulerService.runInstagramHealthCheck();
    res.json({
      success: true,
      data: healthResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('   BOOTSTRAPPING INSTAGRAM JOB SEARCH ENGINE');
  logger.info('=====================================================');

  // 1. Start HTTP Server immediately for health checks
  app.listen(config.port, () => {
    logger.info(`[HTTP SERVER] Running on port ${config.port} (${config.nodeEnv})`);
  });

  // 2. Database Connection & Agent State Initialization
  try {
    await connectDb();
    const agentState = await AgentStateService.getOrCreateAgentState();
    logger.info(`[AGENT ENGINE] Status: ${agentState.status}`);
    logger.info(`[AGENT ENGINE] Manual scan ready. Automatic 2-hour cron loop disabled.`);
  } catch (err: any) {
    logger.warn('[AGENT ENGINE] Initialization warning (DB connection will retry):', err.message);
  }
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap failure:', err);
  process.exit(1);
});
