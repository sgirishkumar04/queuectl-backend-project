// Dead letter queue by listing all dead jobs or resetting dead jobs to pending jobs

const { getDb } = require('../db');
const { handleList } = require('./list');

//it runs when user types "queuectl dlq list"
async function handleDlqList() {

    // select * from jobs where state = 'dead';
    await handleList({ state: 'dead' });
}

//it runs when user types "queuectl dlq retry <job-id>"
async function handleDlqRetry(jobId) {
  try {

    const db = await getDb();
    const result = await db.run(
        // from dead to pending , attempts = 0, run_at now time;
      "UPDATE jobs SET state = 'pending', attempts = 0, run_at = datetime('now') WHERE id = ? AND state = 'dead'",
      jobId
    );

    if (result.changes > 0) {
        // retries
      console.log(`Job ${jobId} has been moved back to the queue for retry.`);
    } else {
        //not found
      console.log(`Job ${jobId} not found in the DLQ.`);
    }
  } catch (error) {

    console.error('Failed to retry job:', error.message);

  }
}

module.exports = { handleDlqList, handleDlqRetry };