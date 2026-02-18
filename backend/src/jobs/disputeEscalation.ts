import { escalateOverdueDisputes } from '../services/disputeService';
import { log } from '../utils/logger';

const ESCALATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let escalationInterval: NodeJS.Timeout | null = null;

/**
 * Run the escalation check once
 */
export async function runEscalationCheck(): Promise<void> {
  try {
    const escalatedCount = await escalateOverdueDisputes();
    if (escalatedCount > 0) {
      log.info('Dispute escalation job completed', { escalatedCount });
    }
  } catch (error) {
    log.error('Dispute escalation job failed', { error });
  }
}

/**
 * Start the escalation job (runs every hour)
 */
export function startDisputeEscalationJob(): void {
  if (escalationInterval) {
    log.warn('Dispute escalation job already running');
    return;
  }

  log.info('Starting dispute escalation job', { intervalMs: ESCALATION_INTERVAL_MS });

  // Run immediately on start
  runEscalationCheck();

  // Then run periodically
  escalationInterval = setInterval(runEscalationCheck, ESCALATION_INTERVAL_MS);
}

/**
 * Stop the escalation job
 */
export function stopDisputeEscalationJob(): void {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    log.info('Dispute escalation job stopped');
  }
}

export default {
  runEscalationCheck,
  startDisputeEscalationJob,
  stopDisputeEscalationJob,
};
