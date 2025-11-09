//display all jobs matching the state
const { getDb } = require('../db');

//it runs when user type "queuectl list"
async function handleList({ state }) {
  try {
    const db = await getDb();
    const jobs = await db.all('SELECT id, command, state, attempts, updated_at FROM jobs WHERE state = ? ORDER BY created_at ASC', state);

    if (jobs.length === 0) {
      console.log(`No jobs found with state: ${state}`);
      return;
    }
    
    console.log(`--- Jobs with state: ${state} ---`);
    console.table(jobs);
  } catch (error) {
    console.error('Failed to list jobs:', error.message);
  }
}

module.exports = { handleList };