const Queue = require('better-queue');

// Create a queue for each network
const networkQueues = {};

/**
 * Gets or creates a queue object for a specific network
 * @param {string} networkKey - Network+networkType key (e.g. "ethereum:mainnet")
 * @param {number} concurrency - Number of concurrent requests that can be processed
 * @returns {Queue} - Queue object
 */
const getNetworkQueue = (networkKey, concurrency = 3) => {
  if (!networkQueues[networkKey]) {
    // Create a new queue with better-queue
    networkQueues[networkKey] = new Queue(
      async (task, cb) => {
        try {
          // Execute task
          const result = await task.fn();
          cb(null, result);
        } catch (error) {
          cb(error);
        }
      },
      {
        concurrent: concurrency,
        maxRetries: 3,
        retryDelay: 1000
      }
    );
    
    // Listen to queue events
    networkQueues[networkKey].on('task_finish', (taskId, result, stats) => {
      console.log(`Task completed (${networkKey}): ${taskId}, duration: ${stats.elapsed}ms`);
    });
    
    networkQueues[networkKey].on('task_failed', (taskId, error, stats) => {
      console.error(`Task failed (${networkKey}): ${taskId}, error: ${error.message}`);
    });
    
    console.log(`New request queue created for "${networkKey}" network.`);
  }
  return networkQueues[networkKey];
};

/**
 * Adds a task to a specific network's queue and waits for its result
 * @param {string} network - Network name
 * @param {string} networkType - Network type
 * @param {Function} taskFn - Async function to be executed
 * @returns {Promise<any>} - Task result
 */
const enqueueNetworkRequest = (network, networkType, taskFn) => {
  return new Promise((resolve, reject) => {
    const networkKey = `${network}:${networkType}`;
    const queue = getNetworkQueue(networkKey);
    
    // Log queue status
    const stats = queue.getStats();
    //console.log(stats); 
    console.log(`"${networkKey}" queue status: ${stats.total} total, ${stats.peak} processing`);
    
    // Add task to queue
    queue.push({
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fn: taskFn
    })
    .on('finish', result => {
      resolve(result);
    })
    .on('failed', error => {
      reject(error);
    });
  });
};

/**
 * Collects information about all queues
 * @returns {Object} Queue statistics
 */
const getQueueStats = () => {
  const stats = {};
  
  Object.keys(networkQueues).forEach(networkKey => {
    const queueStats = networkQueues[networkKey].getStats();
    stats[networkKey] = {
      total: queueStats.total,
      running: queueStats.running,
      queued: queueStats.pending,
      completed: queueStats.finished,
      failed: queueStats.failed,
      retries: queueStats.retries
    };
  });
  
  return stats;
};

module.exports = {
  enqueueNetworkRequest,
  getQueueStats
}; 