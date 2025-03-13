#!/usr/bin/env node

// This script handles special characters in log entries
// by passing all arguments directly to the log command

const { spawnSync } = require('child_process');

// Get all arguments
const args = process.argv.slice(2);

// If no arguments, just run lg (which will show the list)
if (args.length === 0) {
  const result = spawnSync('lg', [], { stdio: 'inherit' });
  process.exit(result.status || 0);
} else {
  // Join all arguments with spaces to create a single message
  const message = args.join(' ');

  // Run the log command with the message
  const result = spawnSync('lg', ['log', message], { stdio: 'inherit' });
  process.exit(result.status || 0);
}
