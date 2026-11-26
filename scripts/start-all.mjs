// Starts the API (port 8001) and the website (port 5173) together. Ctrl+C stops both.
//
//   pnpm start:all            full API: refreshes data from the internet and may download the TimesFM model
//   pnpm start:all --offline  serves the saved data only, nothing is downloaded (fast, works without internet)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const offline = process.argv.includes('--offline');
const python = `${root}forecaster/.venv/bin/python`;

if (!existsSync(python)) {
  console.error('The Python environment is missing. Set it up first:\n  cd forecaster && python -m venv .venv && .venv/bin/pip install -r requirements.txt');
  process.exit(1);
}

const apiEnv = offline ? { ...process.env, SNAPSHOT_MODE: '1', HF_HUB_OFFLINE: '1' } : process.env;
console.log(offline
  ? 'Offline mode: the API serves the saved data and does not download anything.'
  : 'Full mode: the API refreshes data from the internet. Use --offline to skip that.');

const children = [
  ['api', spawn(python, ['-m', 'uvicorn', 'service:app', '--port', '8001'], { cwd: `${root}forecaster`, env: apiEnv, stdio: 'inherit' })],
  ['web', spawn('pnpm', ['exec', 'vite', '--port', '5173'], { cwd: root, stdio: 'inherit' })],
];

let stopping = false;
const stopAll = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const [, child] of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
};

for (const [name, child] of children) {
  child.on('exit', code => {
    if (!stopping) {
      console.error(`\n${name} stopped${code ? ` (exit code ${code})` : ''}; stopping the other one too.`);
      stopAll(code ?? 1);
    }
  });
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
