//for job counts for state and read file for number of workers
const { getDb } = require('../db');

// file system modules for NodeJs
const fs = require('fs');

// path modules for NodeJs
const path = require('path');

const PID_FILE = path.join(process.cwd(), '.worker.pids');

//reporting overall state
async function handleStatus() {
  try {
    const db = await getDb();
    const counts = await db.all(`
      SELECT state, COUNT(*) as count
      FROM jobs
      GROUP BY state
    `);

    console.log('--- Job Status ---');
    if (counts.length === 0) {
        console.log('No jobs in the queue.');
    } else {
        counts.forEach(row => {
          console.log(`${row.state.padEnd(12)}: ${row.count}`);
        });
    }

    console.log('\n--- Worker Status ---');
    const pids = fs.existsSync(PID_FILE) ? fs.readFileSync(PID_FILE, 'utf-8').split('\n').filter(Boolean) : [];
    console.log(`Active Workers: ${pids.length}`);

  } catch (error) {
    console.error('Failed to get status:', error.message);
  }
}

module.exports = { handleStatus };