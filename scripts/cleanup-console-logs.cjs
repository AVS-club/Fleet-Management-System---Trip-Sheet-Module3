/**
 * Automated Console.log Cleanup Script
 *
 * This script helps identify and optionally replace console.log statements
 * with the logger utility across the codebase.
 *
 * Usage:
 *   node scripts/cleanup-console-logs.js --dry-run    # Show what would be changed
 *   node scripts/cleanup-console-logs.js --report     # Generate a report
 *   node scripts/cleanup-console-logs.js --fix        # Auto-fix (use with caution)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isReport = args.includes('--report');
const isFix = args.includes('--fix');

// Statistics
const stats = {
  filesScanned: 0,
  filesWithConsole: 0,
  totalConsoleStatements: 0,
  byType: {
    log: 0,
    warn: 0,
    error: 0,
    info: 0,
    debug: 0
  },
  topOffenders: []
};

/**
 * Recursively find all .ts and .tsx files
 */
function findTSFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, build
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
        files.push(...findTSFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Analyze a file for console statements
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const consoleStatements = [];
  const consoleRegex = /console\.(log|warn|error|info|debug)/g;

  lines.forEach((line, index) => {
    const matches = Array.from(line.matchAll(consoleRegex));
    matches.forEach(match => {
      consoleStatements.push({
        line: index + 1,
        type: match[1],
        content: line.trim()
      });
      stats.byType[match[1]]++;
      stats.totalConsoleStatements++;
    });
  });

  return { consoleStatements, hasLogger: content.includes('createLogger') };
}

/**
 * Generate fix suggestions for a file
 */
function generateFixSuggestions(filePath, statements) {
  const relativePath = path.relative(SRC_DIR, filePath);

  console.log(`\n📄 ${relativePath}`);
  console.log(`   ${statements.length} console statement(s) found\n`);

  statements.forEach(stmt => {
    const replacement = stmt.type === 'error'
      ? `logger.error`
      : stmt.type === 'warn'
      ? `logger.warn`
      : `logger.debug`;

    console.log(`   Line ${stmt.line}:`);
    console.log(`   - ${stmt.content}`);
    console.log(`   + ${stmt.content.replace(`console.${stmt.type}`, replacement)}\n`);
  });
}

/**
 * Auto-fix a file by adding logger import and replacing console statements
 */
function autoFixFile(filePath, statements) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check if logger is already imported
  const hasLoggerImport = content.includes('createLogger');
  const hasAnyImport = content.includes('import');

  if (!hasLoggerImport) {
    // Find the last import statement
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import')) {
        lastImportIndex = i;
      }
    }

    // Add logger import after last import
    if (lastImportIndex !== -1) {
      const importDepth = filePath.split(path.sep).filter(p => p !== 'src').length - 1;
      const relativeImport = '../'.repeat(importDepth) + 'utils/logger';

      lines.splice(lastImportIndex + 1, 0, `import { createLogger } from '${relativeImport}';`);
      lines.splice(lastImportIndex + 2, 0, ``);

      // Add logger constant after imports
      const componentName = path.basename(filePath, path.extname(filePath));
      lines.splice(lastImportIndex + 3, 0, `const logger = createLogger('${componentName}');`);
    }
  }

  // Replace console statements
  content = lines.join('\n');
  content = content.replace(/console\.error\(/g, 'logger.error(');
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  content = content.replace(/console\.log\(/g, 'logger.debug(');
  content = content.replace(/console\.info\(/g, 'logger.info(');

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Console.log Cleanup Tool\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isReport ? 'REPORT' : isFix ? 'AUTO-FIX' : 'ANALYSIS'}\n`);

  const files = findTSFiles(SRC_DIR);
  console.log(`Found ${files.length} TypeScript files\n`);

  files.forEach(filePath => {
    stats.filesScanned++;
    const { consoleStatements, hasLogger } = analyzeFile(filePath);

    if (consoleStatements.length > 0) {
      stats.filesWithConsole++;
      stats.topOffenders.push({
        path: path.relative(SRC_DIR, filePath),
        count: consoleStatements.length,
        hasLogger
      });

      if (isDryRun || (!isReport && !isFix)) {
        generateFixSuggestions(filePath, consoleStatements);
      }

      if (isFix) {
        autoFixFile(filePath, consoleStatements);
        console.log(`✅ Fixed: ${path.relative(SRC_DIR, filePath)}`);
      }
    }
  });

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`Files Scanned: ${stats.filesScanned}`);
  console.log(`Files with Console Statements: ${stats.filesWithConsole}`);
  console.log(`Total Console Statements: ${stats.totalConsoleStatements}\n`);

  console.log('By Type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  - console.${type}: ${count}`);
    }
  });

  console.log('\n🏆 Top 10 Offenders:');
  stats.topOffenders
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((file, index) => {
      const hasLoggerTag = file.hasLogger ? '✅' : '❌';
      console.log(`  ${index + 1}. ${file.path} (${file.count} statements) ${hasLoggerTag} Logger`);
    });

  if (!isFix) {
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the suggestions above');
    console.log('   2. Run with --fix to auto-replace (recommended to commit first)');
    console.log('   3. Manually review critical files like error handlers');
  } else {
    console.log('\n✅ Auto-fix complete!');
    console.log('   Please review the changes and test your application.');
  }
}

main();
