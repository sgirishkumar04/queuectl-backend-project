//Life cycle of working process

//creates new independent processes 
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(process.cwd(), '.worker.pids');

//parese the file
function getPids() {
  if (!fs.existsSync(PID_FILE)) {
    return [];
  } 
  const content = fs.readFileSync(PID_FILE, 'utf-8');
  return content.split('\n').filter(Boolean).map(pid => parseInt(pid, 10));
}

//overwrites whatever there before
function savePids(pids) {
  fs.writeFileSync(PID_FILE, pids.join('\n'));
}

//it runs when user types "queuectl worker start --count 3"
async function handleWorkerStart({ count }) {

  //conerts String to Int
  const numWorkers = parseInt(count, 10);
  console.log(`Starting ${numWorkers} worker(s)...`);
  
  const pids = getPids();
  for (let i = 0; i < numWorkers; i++) {

   //creates a new child
    const workerProcess = spawn('node', [path.join(__dirname, '..', 'worker.js')], {
      detached: true,
      stdio: 'inherit' 
    });
    
    //tells parent process dont need to wait for child to finish
    workerProcess.unref(); 
    pids.push(workerProcess.pid);
    console.log(`Started worker with PID: ${workerProcess.pid}`);
  }
  
  savePids(pids);
}

//defines for "queuectl worker stop"
async function handleWorkerStop() {
    const pids = getPids();

    //if nothing is runnung
    if (pids.length === 0) {
      console.log('No running workers found.');
      return;
    }
  
    console.log('Stopping all workers...');
    pids.forEach(pid => {
      try {

        //kill oe terminate the process
        process.kill(pid, 'SIGTERM');
        console.log(`Sent SIGTERM to worker PID: ${pid}`);
      
      } catch (e) {
        console.log(`Worker PID ${pid} not found or already stopped.`);
      }
    });
  
    fs.writeFileSync(PID_FILE, '');
    console.log('All workers have been signaled to stop.');
}

module.exports = { handleWorkerStart, handleWorkerStop };