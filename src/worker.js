const { getDb } = require('./db');
const { exec } = require('child_process');

let isShuttingDown = false;
let currentJobId = null;

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  isShuttingDown = true;

  if (!currentJobId) {
    process.exit(0);
  }
});

async function findAndProcessJob() {
  const db = await getDb();

  const job = await db.get(`
    UPDATE jobs
    SET state = 'processing', updated_at = datetime('now')
    WHERE id = (
      SELECT id FROM jobs
      WHERE state = 'pending' AND run_at <= datetime('now')
      ORDER BY created_at ASC
      LIMIT 1
    )
    RETURNING *;
  `);

  if (!job) {

    return null;
  }

  currentJobId = job.id;
  console.log(`Worker ${process.pid}: Started processing job ${job.id}`);

  return new Promise((resolve) => {
    exec(job.command, async (error, stdout, stderr) => {
      const db = await getDb();
      
      if (error) { 
        console.error(`Worker ${process.pid}: Job ${job.id} failed. Exit code: ${error.code}`);
        const attempts = job.attempts + 1;

        if (attempts >= job.max_retries) {
          
          await db.run(
            "UPDATE jobs SET state = 'dead', updated_at = datetime('now') WHERE id = ?",
            job.id
          );
          console.log(`Worker ${process.pid}: Job ${job.id} moved to DLQ after ${attempts} attempts.`);
        } else {
          
          const config = await db.get('SELECT value FROM config WHERE key = ?', 'backoff_base');
          const backoffBase = parseInt(config.value, 10);
          const delayInSeconds = Math.pow(backoffBase, attempts);
          
          await db.run(
            `UPDATE jobs SET state = 'pending', attempts = ?, run_at = datetime('now', ? || ' seconds'), updated_at = datetime('now') WHERE id = ?`,
            attempts,
            delayInSeconds.toString(),
            job.id
          );
          console.log(`Worker ${process.pid}: Job ${job.id} will be retried in ${delayInSeconds} seconds.`);
        }

      } else { 
        await db.run(
          "UPDATE jobs SET state = 'completed', updated_at = datetime('now') WHERE id = ?",
          job.id
        );
        console.log(`Worker ${process.pid}: Job ${job.id} completed successfully.`);
      }
      
      currentJobId = null;
      resolve();
    });
  });
}

async function mainLoop() {
  console.log(`Worker with PID ${process.pid} started.`);
  while (!isShuttingDown) {
    const job = await findAndProcessJob();
    if (!job) {
    
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`Worker ${process.pid} finished its current job and is shutting down.`);
}

mainLoop().catch(err => {
  console.error("Worker loop failed:", err);
  process.exit(1);
});