import { Router } from 'express';
import { AgentStateService } from '../services/agentState.service.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { formatIST } from '../utils/date.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const state = await AgentStateService.getOrCreateAgentState();
    res.json({
      success: true,
      data: {
        id: state.id,
        status: state.status,
        agentStartTime: state.agent_start_time,
        agentStartTimeFormatted: formatIST(state.agent_start_time),
        lastSuccessfulCheck: state.last_successful_check,
        lastSuccessfulCheckFormatted: state.last_successful_check ? formatIST(state.last_successful_check) : 'Never',
        lastError: state.last_error
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    await AgentStateService.setStatus('RUNNING');
    SchedulerService.startScheduler();
    res.json({ success: true, message: 'Agent started successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/pause', async (req, res) => {
  try {
    await AgentStateService.setStatus('PAUSED');
    res.json({ success: true, message: 'Agent paused' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await AgentStateService.setStatus('STOPPED');
    SchedulerService.stopScheduler();
    res.json({ success: true, message: 'Agent stopped' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/run-now', async (req, res) => {
  try {
    const result = await SchedulerService.executeCheckCycle();
    res.json({ success: true, message: 'Check cycle completed', data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reset-start-time', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation parameter { confirm: true } is required to reset AGENT_START_TIME'
      });
    }

    const newState = await AgentStateService.resetAgentStartTime(true);
    res.json({
      success: true,
      message: 'AGENT_START_TIME successfully reset',
      data: {
        newStartTime: newState.agent_start_time,
        newStartTimeFormatted: formatIST(newState.agent_start_time)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
