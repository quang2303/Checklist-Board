/**
 * Recalculate job status based on step statuses
 * @param {Array} steps - The array of steps in the job
 * @returns {string} - 'pending' | 'failed' | 'completed' | 'in_progress'
 */
function recalculateJobStatus(steps) {
  if (steps.length === 0) return 'pending';
  
  const hasFailed = steps.some(s => s.status === 'failed');
  if (hasFailed) return 'failed';
  
  const allCompleted = steps.every(s => s.status === 'completed');
  if (allCompleted) return 'completed';
  
  const hasCompleted = steps.some(s => s.status === 'completed' || s.status === 'failed');
  if (hasCompleted) return 'in_progress';
  
  return 'pending';
}

module.exports = {
  recalculateJobStatus
};
