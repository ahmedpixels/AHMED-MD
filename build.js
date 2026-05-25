import fs from 'fs-extra';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = __dirname;
const TARGET_DIR = path.resolve(SOURCE_DIR, '../AHMED-MD-PUBLIC');

// Files/folders to completely exclude from the public build
const EXCLUDE_LIST = [
  '.git',
  'node_modules',
  'session',
  'config.env',
  'database.json',
  'build.js',
  'scratch',
  'package-lock.json',
  'yt-dlp.exe',
  'test_audio.webm',
  'test_tiktok.mp4',
  'emix.png',
  'hijack.jpg',
  'online.jpg'
];

// Obfuscation configuration for high security & Node.js compatibility
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: false, // Set false to keep execution fast and prevent memory issues
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Set false to prevent breaking exports/imports in ES Modules
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['rc4'], // Encrypt all strings inside the code
  stringArrayThreshold: 0.8,
  target: 'node',
  unicodeEscapeSequence: false
};

async function cleanTargetDirectory() {
  console.log(`🧹 Cleaning target directory: ${TARGET_DIR}`);
  if (await fs.pathExists(TARGET_DIR)) {
    await fs.emptyDir(TARGET_DIR);
  } else {
    await fs.ensureDir(TARGET_DIR);
  }
}

async function processDirectory(currentDir, relativePath = '') {
  const items = await fs.readdir(currentDir);

  for (const item of items) {
    const itemPath = path.join(currentDir, item);
    const itemRelativePath = relativePath ? path.join(relativePath, item) : item;

    // Check if item is in the exclude list
    if (EXCLUDE_LIST.includes(itemRelativePath) || EXCLUDE_LIST.includes(item)) {
      continue;
    }

    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      const destDir = path.join(TARGET_DIR, itemRelativePath);
      await fs.ensureDir(destDir);
      await processDirectory(itemPath, itemRelativePath);
    } else if (stat.isFile()) {
      const destPath = path.join(TARGET_DIR, itemRelativePath);

      if (item.endsWith('.js') && item !== 'build.js' && item !== 'bootloader.js') {
        console.log(`🔒 Obfuscating: ${itemRelativePath}`);
        try {
          const code = await fs.readFile(itemPath, 'utf8');
          const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
          await fs.writeFile(destPath, obfuscatedResult.getObfuscatedCode(), 'utf8');
        } catch (error) {
          console.error(`❌ Error obfuscating ${itemRelativePath}:`, error.message);
          // Fallback to direct copy if obfuscation fails for some reason
          await fs.copy(itemPath, destPath);
        }
      } else if (item === 'package.json') {
        console.log(`📝 Processing package.json...`);
        const pkg = await fs.readJson(itemPath);
        
        // Remove devDependencies so users don't install development tools
        delete pkg.devDependencies;
        
        // Remove build script from public version
        if (pkg.scripts && pkg.scripts.build) {
          delete pkg.scripts.build;
        }

        await fs.writeJson(destPath, pkg, { spaces: 2 });
      } else {
        console.log(`📂 Copying asset: ${itemRelativePath}`);
        await fs.copy(itemPath, destPath);
      }
    }
  }
}

async function startBuild() {
  console.log('🚀 Starting secure close-source build process...');
  const startTime = Date.now();

  try {
    await cleanTargetDirectory();
    await processDirectory(SOURCE_DIR);
    
    // Create a secure deployment-ready .gitignore in the public folder
    const publicGitignore = `node_modules\nsession\nconfig.env\ndatabase.json\n.env\n`;
    await fs.writeFile(path.join(TARGET_DIR, '.gitignore'), publicGitignore, 'utf8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Build completed successfully in ${duration} seconds!`);
    console.log(`📁 Obfuscated build location: ${TARGET_DIR}`);
    console.log('You can now push the contents of that folder to your public GitHub repo.');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

startBuild();
