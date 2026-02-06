#!/usr/bin/env node

const { startServer } = require('../dist/index.js');

// Parse command line arguments
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : undefined;

// Start the server
startServer({ port });
