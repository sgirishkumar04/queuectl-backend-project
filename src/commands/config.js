//Securly updates or config key or value pair in database config , by user input in CLI
const { getDb } = require('../db');

// cli.js call this func for "queuectl config set" command
async function handleConfigSet(key, value) {

  const allowedKeys = ['max-retries', 'backoff-base'];
  const dbKey = key.replace('-', '_');

  //if the key is wrong , it gives error
  if (!allowedKeys.includes(key)) {
    console.error(`Error: Invalid config key. Allowed keys: ${allowedKeys.join(', ')}`);
    return;
  }
  
  try {
    const db = await getDb();
    await db.run(

       // prevents sql injection , if already exists it deletes and add new one
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      dbKey,
      value
    );
    
    //if updated,in console it prints
    console.log(`Configuration updated: ${key} = ${value}`);

  } catch (error) {

    //if not updated,in console it prints
    console.error('Failed to set config:', error.message);

  }
}

module.exports = { handleConfigSet };