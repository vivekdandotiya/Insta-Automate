import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { formatIST } from '../utils/date.js';

export class AgentStateService {
  /**
   * Initializes or retrieves the permanent AGENT_START_TIME.
   * Requirement 3 & 4: Recorded once on first boot and persisted permanently.
   * Requirement 5: Restart retrieves existing timestamp without overwriting.
   */
  static async getOrCreateAgentState() {
    let state = await prisma.agentState.findUnique({
      where: { id: 1 }
    });

    if (!state) {
      const now = new Date();
      state = await prisma.agentState.create({
        data: {
          id: 1,
          agent_start_time: now,
          status: 'RUNNING'
        }
      });
      logger.info(`[AGENT STATE] Initialized new AGENT_START_TIME: ${formatIST(now)}`);
    } else {
      logger.info(`[AGENT STATE] Retrieved existing AGENT_START_TIME: ${formatIST(state.agent_start_time)}`);
    }

    return state;
  }

  /**
   * Updates the LAST_SUCCESSFUL_CHECK timestamp
   */
  static async updateLastSuccessfulCheck(checkTime: Date = new Date()) {
    await prisma.agentState.update({
      where: { id: 1 },
      data: {
        last_successful_check: checkTime,
        status: 'RUNNING',
        last_error: null
      }
    });
  }

  /**
   * Set agent status (RUNNING, PAUSED, STOPPED, ERROR)
   */
  static async setStatus(status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR', errorMsg?: string) {
    await prisma.agentState.update({
      where: { id: 1 },
      data: {
        status,
        ...(errorMsg ? { last_error: errorMsg } : {})
      }
    });
  }

  /**
   * Admin Reset AGENT_START_TIME (Requires explicit confirmation parameter)
   * Requirement 37: "Never reset automatically. Show confirmation before establishing new start timestamp."
   */
  static async resetAgentStartTime(confirm: boolean = false) {
    if (!confirm) {
      throw new Error('Resetting AGENT_START_TIME requires explicit confirmation flag');
    }

    const now = new Date();
    const updated = await prisma.agentState.update({
      where: { id: 1 },
      data: {
        agent_start_time: now,
        last_successful_check: null,
        status: 'RUNNING',
        last_error: null
      }
    });

    logger.warn(`[AGENT STATE] Admin RESET AGENT_START_TIME to: ${formatIST(now)}`);
    return updated;
  }
}
