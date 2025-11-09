//take the user input and inserts as new pending job into database
const { getDb } = require('../db');

// auto assign unique ID for jobs
const { v4: uuidv4 } = require('uuid');

//it runs when user types "queuectl enqueue"
async function handleEnqueue(jobJson) {
  try {
    // input into JavaScript Object
    const jobData = JSON.parse(jobJson);
    const db = await getDb();
    
    const config = await db.get('SELECT value FROM config WHERE key = ?', 'max_retries');
    
    const job = {
      id: jobData.id || uuidv4(),
      command: jobData.command,
      max_retries: jobData.max_retries || parseInt(config.value, 10),
    };
    
    if (!job.command) {
      console.error('Error: Job command is required.');
      return;
    }
    
    //insert the job
    await db.run(
      'INSERT INTO jobs (id, command, max_retries) VALUES (?, ?, ?)',
      job.id,
      job.command,
      job.max_retries
    );
    
    console.log(`Successfully enqueued job with ID: ${job.id}`);

  } catch (error) {
    console.error('Failed to enqueue job:', error.message);
  }
}

module.exports = { handleEnqueue };