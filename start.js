const { spawnSync, spawn } = require('child_process');
const { existsSync, writeFileSync } = require('fs');
const path = require('path');

const SESSION_ID = 'updateThis'; // Edit only this value

let nodeRestartCount = 0;
const maxNodeRestarts = 5;
const restartWindow = 30000;
let lastRestartTime = Date.now();

function startNode() {
  const child = spawn('node', ['index.js'], { cwd: 'AHMED-MD', stdio: 'inherit' });

  child.on('exit', (code) => {
    const currentTime = Date.now();
    if (currentTime - lastRestartTime > restartWindow) nodeRestartCount = 0;
    lastRestartTime = currentTime;
    nodeRestartCount++;

    if (nodeRestartCount > maxNodeRestarts) {
      console.error('❌ Node.js is crashing repeatedly. Stopping.');
      return;
    }
    console.log(`⚠️ Node.js exited with code ${code}. Restarting... (Attempt ${nodeRestartCount})`);
    startNode();
  });
}

function startPm2() {
  const pm2 = spawn('yarn', ['pm2', 'start', 'index.js', '--name', 'AHMED-MD', '--attach'], {
    cwd: 'AHMED-MD',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let restartCount = 0;
  const maxRestarts = 5;

  pm2.on('exit', () => startNode());

  pm2.on('error', (error) => {
    console.error(`PM2 Error: ${error.message}`);
    startNode();
  });

  if (pm2.stderr) {
    pm2.stderr.on('data', (data) => {
      if (data.toString().includes('restart')) {
        restartCount++;
        if (restartCount > maxRestarts) {
          spawnSync('yarn', ['pm2', 'delete', 'AHMED-MD'], { cwd: 'AHMED-MD', stdio: 'inherit' });
          startNode();
        }
      }
    });
  }

  if (pm2.stdout) {
    pm2.stdout.on('data', (data) => {
      console.log(data.toString());
    });
  }
}

function installDependencies() {
  const result = spawnSync(
    'yarn',
    ['install', '--force', '--non-interactive', '--network-concurrency', '3'],
    {
      cwd: 'AHMED-MD',
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    }
  );

  if (result.error || result.status !== 0) {
    console.error('❌ Dependency installation failed.');
    process.exit(1);
  }
}

function checkDependencies() {
  if (!existsSync(path.resolve('AHMED-MD/package.json'))) {
    console.error('❌ package.json not found!');
    process.exit(1);
  }

  const result = spawnSync('yarn', ['check', '--verify-tree'], {
    cwd: 'AHMED-MD',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.log('📦 Reinstalling broken dependencies...');
    installDependencies();
  }
}

function cloneRepository() {
  console.log('📥 Cloning AHMED-MD repository...');
  const clone = spawnSync(
    'git',
    ['clone', 'https://github.com/ahmedpixels/AHMED-MD.git', 'AHMED-MD'],
    { stdio: 'inherit' }
  );

  if (clone.error) {
    throw new Error(`Clone failed: ${clone.error.message}`);
  }

  const configPath = 'AHMED-MD/config.env';
  try {
    writeFileSync(configPath, `VPS=true\nSESSION_ID=${SESSION_ID}`);
  } catch (err) {
    throw new Error(`Failed to write config.env: ${err.message}`);
  }

  installDependencies();
}

if (!existsSync('AHMED-MD')) {
  cloneRepository();
  checkDependencies();
} else {
  checkDependencies();
}

startPm2();
