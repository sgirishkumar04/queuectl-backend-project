#!/bin/bash

#Exit if a command exits with non zero
set -e

print_header() {
    echo ""
    echo "$1"
    echo ""
}

print_header "1: CLEANUP & SETUP"
echo ">> Removing old database and worker PID"
rm -f queue.db .worker.pids
echo "Cleanup complete."

print_header "2: CONFIGURATION"
echo ">> Setting max_retries = 2"
echo ">> Failing jobs to move to DLQ after doing 2 attempts"

queuectl config set max-retries 2

print_header "3: ENQUEUE JOBS & INITIAL STATUS"

echo ">> Enqueuing three jobs: one success, one that fails, one with an invalid"

queuectl enqueue '{"id": "job-success", "command": "echo SUCCESS"}'
queuectl enqueue '{"id": "job-fail", "command": "exit 1"}'
queuectl enqueue '{"id": "job-invalid", "command": "nonexistent_command"}'

echo ">> Checking initial status:"
queuectl status

print_header "4: START WORKERS & PROCESS QUEUE"

echo ">> Starting 2 workers in back"
queuectl worker start --count 2

echo ">> --- Waiting 5 seconds for initial processing ---"
echo ">> (Success job should complete, fail jobs should attempt once and be rescheduled)"
sleep 5

print_header "INTERIM STATUS CHECK (Jobs should be retrying with backoff)"
echo ">> We should see: 1 completed, 2 pending (waiting for their backoff delay)."
queuectl status

echo ">> --- Waiting 10 more seconds for retries to exhaust ---"
sleep 10

print_header "5: FINAL STATUS & VERIFICATION"
echo ">> Checking the final state of the queue. Failed jobs should now be in the DLQ."
queuectl status

echo ">> Listing COMPLETED jobs:"
queuectl list --state completed

echo ">> Listing DEAD jobs (DLQ):"
queuectl dlq list

print_header "6: DLQ MANAGEMENT"
echo ">> Manually retrying 'job-fail' from the DLQ..."
queuectl dlq retry job-fail

echo ">> Checking status to confirm 'job-fail' is pending again."
queuectl status
queuectl list --state pending

print_header "7: GRACEFUL SHUTDOWN TEST"
echo ">> Enqueuing a long-running job (sleep 10)..."
queuectl enqueue '{"id":"long-job", "command":"sleep 10"}'

queuectl worker stop
sleep 1 
echo ">> Starting 1 new worker for this specific test..."
queuectl worker start --count 1

echo ">> Waiting 3 seconds for the worker to pick up and start the long job..."
sleep 3

print_header "ISSUING STOP COMMAND WHILE JOB IS RUNNING"
echo ">> The job state should be 'processing'."
queuectl status
queuectl worker stop

echo ">> Worker has been signaled to stop. It should finish its current job first."
echo ">> Waiting 8 seconds for the 'sleep 10' command to complete..."
sleep 8

print_header "FINAL CHECK AFTER GRACEFUL SHUTDOWN"
echo ">> The 'long-job' should now be 'completed', NOT 'pending' or 'processing'."
echo ">> This proves the worker finished its work before exiting."
queuectl status
queuectl list --state completed

print_header "TEST COMPLETE"