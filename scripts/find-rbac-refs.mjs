#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const RBAC_PATTERNS = [
  /RoleGate/gi,
  /getRole/gi,
  /__debugGetRole/gi,
  /profiles\.role/gi,
  /Role\s*=\s*("|')OWNER("|')/gi,
  /Role\s*=\s*("|')ADD_ONLY("|')/gi,
  /DebugRoleBanner/gi,
  /AddHub/gi,
  /DocumentForm/gi,
  /\bprofiles?\b(?!\s*(table|from|select))/gi // Match 'profile' or 'profiles' but not in SQL contexts
];

const PATTERN_NAMES = [
  'RoleGate',
  'getRole', 
  '__debugGetRole',
  'profiles.role',
  'Role=OWNER',
  'Role=ADD_ONLY',
  'DebugRoleBanner',
  'AddHub',
  'DocumentForm',
  'profile(s) usage'
];

async function scanDirectory(dirPath, results = []) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanDirectory(fullPath, results);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            RBAC_PATTERNS.forEach((pattern, patternIndex) => {
              const matches = line.match(pattern);
              if (matches) {
                matches.forEach(match => {
                  results.push({
                    file: fullPath.replace(process.cwd() + '/', ''),
                    line: index + 1,
                    pattern: PATTERN_NAMES[patternIndex],
                    match: match.trim(),
                    context: line.trim()
                  });
                });
              }
            });
          });
        } catch (error) {
          console.error(`Error reading file ${fullPath}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return results;
}

async function main() {
  console.log('🔍 Scanning for RBAC/Profile references...\n');
  
  const results = await scanDirectory('src');
  
  if (results.length === 0) {
    console.log('✅ No RBAC/Profile references found!');
    return;
  }
  
  console.log(`❌ Found ${results.length} RBAC/Profile references:\n`);
  console.log('| File | Line | Pattern | Match | Context |');
  console.log('|------|------|---------|-------|---------|');
  
  results.forEach(result => {
    const shortContext = result.context.length > 50 
      ? result.context.substring(0, 47) + '...'
      : result.context;
    
    console.log(`| ${result.file} | ${result.line} | ${result.pattern} | \`${result.match}\` | ${shortContext} |`);
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`Total files with issues: ${new Set(results.map(r => r.file)).size}`);
  console.log(`Total references: ${results.length}`);
  
  // Group by pattern
  const patternCounts = {};
  results.forEach(result => {
    patternCounts[result.pattern] = (patternCounts[result.pattern] || 0) + 1;
  });
  
  console.log('\n📈 By pattern:');
  Object.entries(patternCounts).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`);
  });
  
  process.exit(0); // Exit successfully even if references found (for reporting only)
}

main().catch(error => {
  console.error('Error running RBAC scan:', error);
  process.exit(1);
});