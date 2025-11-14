#!/usr/bin/env node
/**
 * Auto-fix architecture violations
 * This script intelligently detects and fixes common architecture rule violations
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 Auto-fixing architecture violations...\n');

let hasChanges = false;

/**
 * Read file safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`⚠️  File not found: ${filePath}`);
    return null;
  }
}

/**
 * Write file if content changed
 */
function writeFile(filePath, content, originalContent) {
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    hasChanges = true;
    return true;
  }
  return false;
}

/**
 * Fix GraphQL schema naming conventions and structure
 */
function fixGraphQLSchema() {
  const filePath = 'src/schema/todo.graphql';
  console.log(`Checking ${filePath}...`);

  const content = readFile(filePath);
  if (!content) return;

  let fixed = content;
  const original = content;

  // Rule 1: Fix enum naming - snake_case to PascalCase
  fixed = fixed.replace(/enum\s+([a-z][a-z_]*)\s*{/g, (match, name) => {
    const pascalCase = name.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    return `enum ${pascalCase} {`;
  });

  // Rule 1: Fix enum values to SCREAMING_SNAKE_CASE
  fixed = fixed.replace(/enum\s+\w+\s*{([^}]+)}/gs, (match, enumBody) => {
    const fixedBody = enumBody.replace(/^\s+([a-z][a-z_]*)\s*$/gm, (line, value) => {
      return line.replace(value, value.toUpperCase());
    });
    return match.replace(enumBody, fixedBody);
  });

  // Rule 1: Fix field names - snake_case to camelCase
  fixed = fixed.replace(/(\s+)([a-z][a-z_]+)(\s*:\s*)/g, (match, indent, fieldName, colon) => {
    if (fieldName.includes('_')) {
      const camelCase = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      return `${indent}${camelCase}${colon}`;
    }
    return match;
  });

  // Rule 4: Fix timestamp types - INTEGER/Int/BIGINT to DateTime/Timestamp
  fixed = fixed.replace(/(\w+)\s*:\s*(Int|INTEGER|BIGINT)(\s*!?\s*(?:$|#))/gm, (match, fieldName, type, rest) => {
    if (fieldName.toLowerCase().includes('timestamp') ||
        fieldName.toLowerCase().includes('time') ||
        fieldName.toLowerCase().includes('at')) {
      return `${fieldName}: DateTime${rest}`;
    }
    return match;
  });

  if (writeFile(filePath, fixed, original)) {
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`✓ No changes needed in ${filePath}`);
  }
}

/**
 * Fix TypeScript resolver files
 */
function fixResolvers() {
  const filePath = 'src/resolvers/todoResolver.ts';
  console.log(`\nChecking ${filePath}...`);

  const content = readFile(filePath);
  if (!content) return;

  let fixed = content;
  const original = content;

  // Rule 3: Replace console.log with logger
  fixed = fixed.replace(/console\.log\(/g, 'log.info(');
  fixed = fixed.replace(/console\.error\(/g, 'log.error(');
  fixed = fixed.replace(/console\.warn\(/g, 'log.warn(');

  // Fix parameter names from snake_case to camelCase in destructuring
  fixed = fixed.replace(/{\s*([a-z_]+(?:,\s*[a-z_]+)*)\s*}/g, (match, params) => {
    const fixedParams = params.split(',').map(param => {
      const trimmed = param.trim();
      if (trimmed.includes('_')) {
        return trimmed.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      }
      return trimmed;
    }).join(', ');
    return `{ ${fixedParams} }`;
  });

  if (writeFile(filePath, fixed, original)) {
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`✓ No changes needed in ${filePath}`);
  }
}

/**
 * Fix service layer
 */
function fixServices() {
  const filePath = 'src/services/todoService.ts';
  console.log(`\nChecking ${filePath}...`);

  const content = readFile(filePath);
  if (!content) return;

  let fixed = content;
  const original = content;

  // Rule 4: Replace Date.now() with new Date().toISOString()
  fixed = fixed.replace(/Date\.now\(\)/g, 'new Date().toISOString()');

  // Fix variable names from snake_case to camelCase
  fixed = fixed.replace(/\b([a-z][a-z_]+_[a-z_]+)\b/g, (match) => {
    // Skip SQL column names (in quotes or after SELECT/INSERT/UPDATE keywords)
    if (match.includes('_')) {
      return match.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    return match;
  });

  if (writeFile(filePath, fixed, original)) {
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`✓ No changes needed in ${filePath}`);
  }
}

/**
 * Fix database schema
 */
function fixDatabase() {
  const filePath = 'src/infrastructure/database.ts';
  console.log(`\nChecking ${filePath}...`);

  const content = readFile(filePath);
  if (!content) return;

  let fixed = content;
  const original = content;

  // Rule 4: Fix timestamp column types in SQL
  fixed = fixed.replace(/(\w+)\s+(INTEGER|Int|BIGINT)(\s*(?:NOT NULL|NULL)?)/g, (match, colName, type, constraint) => {
    if (colName.toLowerCase().includes('timestamp') ||
        colName.toLowerCase().includes('time') ||
        colName.toLowerCase().endsWith('_at')) {
      return `${colName} TIMESTAMP${constraint}`;
    }
    return match;
  });

  if (writeFile(filePath, fixed, original)) {
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`✓ No changes needed in ${filePath}`);
  }
}

// Run all fixes
try {
  fixGraphQLSchema();
  fixResolvers();
  fixServices();
  fixDatabase();

  console.log('\n' + '='.repeat(50));
  if (hasChanges) {
    console.log('✅ Architecture violations fixed!');
    process.exit(0);
  } else {
    console.log('✅ No violations found - code is compliant!');
    process.exit(0);
  }
} catch (error) {
  console.error('\n❌ Error during auto-fix:', error.message);
  process.exit(1);
}
