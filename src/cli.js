#!/usr/bin/env node
//executable script

const { program } = require('commander');
const { handleEnqueue } = require('./commands/enqueue');
const { handleWorkerStart, handleWorkerStop } = require('./commands/workerManager');
const { handleStatus } = require('./commands/status');
const { handleList } = require('./commands/list');
const { handleDlqList, handleDlqRetry } = require('./commands/dlq');
const { handleConfigSet } = require('./commands/config');

//"queuectl --help" will display these
program
  .name('queuectl')
  .description('A CLI-based background job queue system.');

//for "enqueue" command
program
  .command('enqueue <jobJson>')
  .description('Add a new job to the queue. e.g., \'{"id":"job1","command":"sleep 2"}\'')
  .action(handleEnqueue);

// for "queuectl worker ...." command
const workerCommand = program.command('worker').description('Manage worker processes');
workerCommand
  .command('start')
  .description('Start one or more workers')
  .option('-c, --count <number>', 'Number of workers to start', '1')
  .action(handleWorkerStart);
workerCommand
  .command('stop')
  .description('Stop all running workers gracefully')
  .action(handleWorkerStop);

  //for status
program
  .command('status')
  .description('Show a summary of all job states & active workers')
  .action(handleStatus);

  // for listing
program
  .command('list')
  .description('List jobs by state')
  .option('--state <state>', 'Filter by job state (pending, processing, completed, failed, dead)', 'pending')
  .action(handleList);
  
//manages dead letter queue
const dlqCommand = program.command('dlq').description('Manage the Dead Letter Queue');
dlqCommand
  .command('list')
  .description('View all jobs in the DLQ')
  .action(handleDlqList);
dlqCommand
  .command('retry <jobId>')
  .description('Retry a specific job from the DLQ')
  .action(handleDlqRetry);

  //for config
program
  .command('config')
  .command('set <key> <value>')
  .description('Set a configuration value (e.g., max-retries, backoff-base)')
  .action(handleConfigSet);

program.parse(process.argv);