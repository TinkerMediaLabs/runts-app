#!/usr/bin/env node
/**
 * codemod-text-imports.js
 *
 * Rewrites `import { Text, TextInput, ... } from 'react-native'` so that
 * Text and TextInput come from our AppText/AppTextInput wrappers instead,
 * while leaving every other react-native import untouched.
 *
 * Usage:
 *   node scripts/codemod-text-imports.js         (dry run — lists files that would change)
 *   node scripts/codemod-text-imports.js --write (applies changes)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SKIP_FILES = ['AppText.tsx', 'AppTextInput.tsx'];
const WRITE = process.argv.includes('--write');

const RN_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*(['"])react-native\2;?/;

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP_FILES.includes(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes("from 'react-native'") && !original.includes('from "react-native"')) {
    return null;
  }

  const match = original.match(RN_IMPORT_RE);
  if (!match) return null;

  const names = match[1]
    .split(',')
    .map(n => n.trim())
    .filter(Boolean);

  const hasText = names.includes('Text');
  const hasTextInput = names.includes('TextInput');

  if (!hasText && !hasTextInput) return null;

  const remaining = names.filter(n => n !== 'Text' && n !== 'TextInput');

  let newRnImport = '';
  if (remaining.length > 0) {
    newRnImport = `import { ${remaining.join(', ')} } from 'react-native';`;
  }

  const newLines = [];
  if (newRnImport) newLines.push(newRnImport);
  if (hasText && !original.includes("AppText'") && !original.includes('AppText"')) {
    newLines.push(`import { Text } from '@/components/common/AppText';`);
  }
  if (hasTextInput && !original.includes("AppTextInput'") && !original.includes('AppTextInput"')) {
    newLines.push(`import { TextInput } from '@/components/common/AppTextInput';`);
  }

  const replacement = newLines.join('\n');
  const updated = original.replace(RN_IMPORT_RE, replacement);

  return { filePath, hasText, hasTextInput, updated };
}

const files = walk(SRC_DIR);
const changes = files.map(processFile).filter(Boolean);

console.log(`Found ${changes.length} file(s) to update:\n`);
for (const c of changes) {
  const rel = path.relative(process.cwd(), c.filePath);
  const tags = [c.hasText && 'Text', c.hasTextInput && 'TextInput'].filter(Boolean).join(' + ');
  console.log(`  ${rel}  [${tags}]`);
}

if (WRITE) {
  for (const c of changes) {
    fs.writeFileSync(c.filePath, c.updated, 'utf8');
  }
  console.log(`\n✅ Wrote changes to ${changes.length} file(s).`);
} else {
  console.log(`\nDry run only — no files written. Re-run with --write to apply.`);
}
