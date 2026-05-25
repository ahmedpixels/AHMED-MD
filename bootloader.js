/**
 * AHMED-MD WhatsApp Bot - VPS Bootloader / Launcher
 * 
 * Upload this single file to your VPS panel, configure your Session ID,
 * and start it. It will automatically clone/update the bot and run it.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── CONFIGURATION ──────────────────────────────────────────
const SESSION_ID = 'AHMED-MD-YOUR-SESSION-ID-HERE'; // Replace with your actual Session ID
const REPO_URL = 'https://github.com/ahmedpixels/AHMED-MD.git';
const BOT_DIR = path.resolve('./ahmed_bot');
// ───────────────────────────────────────────────────────────

function runCmd(cmd, cwd = process.cwd()) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    console.error(`❌ Failed to run command: ${cmd}`, error.message);
    return false;
  }
}

async function setupAndStart() {
  console.log('🚀 AHMED-MD VPS Bootloader Active...');

  // 1. Clone or pull the latest obfuscated code from GitHub
  if (!fs.existsSync(BOT_DIR)) {
    console.log(`📥 Cloning latest bot files from: ${REPO_URL}`);
    const cloneOk = runCmd(`git clone ${REPO_URL} "${BOT_DIR}"`);
    if (!cloneOk) {
      console.error('❌ Failed to clone repository. Make sure Git is installed on your VPS.');
      process.exit(1);
    }
  } else {
    console.log('🔄 Repository already exists. Pulling latest updates...');
    runCmd('git pull', BOT_DIR);
  }

  // 2. Create config.env with the configured Session ID inside the bot directory
  console.log('📝 Setting up config.env with your Session ID...');
  const envContent = `SESSION_ID="${SESSION_ID}"\nPREFIX="."\nMODE="public"\n`;
  fs.writeFileSync(path.join(BOT_DIR, 'config.env'), envContent, 'utf8');

  // 3. Install bot dependencies
  console.log('📦 Installing dependencies (this may take a minute)...');
  const installOk = runCmd('npm install --production', BOT_DIR);
  if (!installOk) {
    console.error('❌ Dependency installation failed.');
    process.exit(1);
  }

  // 4. Start the bot process
  console.log('⚡ Starting AHMED-MD Bot...');
  const botProcess = spawn('node', ['index.js'], {
    cwd: BOT_DIR,
    stdio: 'inherit'
  });

  botProcess.on('close', (code) => {
    console.log(`🤖 Bot process exited with code ${code}`);
    process.exit(code);
  });
}

setupAndStart();
