#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'dist', 'index.js');

// Forward all stdio to the actual server
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: dirname(__dirname)
});

child.on('exit', (code) => {
  process.exit(code);
});