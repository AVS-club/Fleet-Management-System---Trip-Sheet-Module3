/**
 * Fix Logger Import Paths
 *
 * The cleanup script added incorrect import paths. This fixes them.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

function findTSFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
        files.push(...findTSFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixImportPath(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if file has logger import
  if (!content.includes('createLogger')) {
    return false;
  }

  // Calculate correct relative path
  const relativePath = path.relative(path.dirname(filePath), path.join(SRC_DIR, 'utils/logger'));
  const normalizedPath = relativePath.split(path.sep).join('/');

  // Fix the import statement - replace any existing logger import
  const badImportRegex = /import\s*{\s*createLogger\s*}\s*from\s*['"][^'"]*logger['"]/g;
  const newImport = `import { createLogger } from '${normalizedPath}'`;

  const newContent = content.replace(badImportRegex, newImport);

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }

  return false;
}

function main() {
  console.log('🔧 Fixing Logger Import Paths\n');

  const files = findTSFiles(SRC_DIR);
  let fixed = 0;

  files.forEach(filePath => {
    if (fixImportPath(filePath)) {
      fixed++;
      console.log(`✅ Fixed: ${path.relative(SRC_DIR, filePath)}`);
    }
  });

  console.log(`\n✅ Fixed ${fixed} files!`);
}

main();
