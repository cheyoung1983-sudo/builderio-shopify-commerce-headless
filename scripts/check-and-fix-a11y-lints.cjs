#!/usr/bin/env node

/**
 * Script: check-and-fix-a11y-lints.js
 * Identifies and rectifies JSX accessibility (a11y) warnings and errors,
 * such as unsupported ARIA props on HTML head elements like <meta>.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running A11y & JSX Lint Audit and Rectification Script...\n');

let errorCount = 0;
let fixedCount = 0;

function scanAndFixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Rule 1: Remove `aria-description` or invalid ARIA props from <meta> tags
  if (content.includes('<meta') && content.includes('aria-description=')) {
    content = content.replace(/<meta\s+([^>]*?)aria-description=("[^"]*"|'[^']*')([^>]*?)\/>/g, (match, p1, p2, p3) => {
      fixedCount++;
      return `<meta ${p1}content=${p2}${p3}/>`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Rectified invalid ARIA attributes in: ${path.relative(process.cwd(), filePath)}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|jsx|js|ts)$/.test(entry.name)) {
      scanAndFixFile(fullPath);
    }
  }
}

try {
  walkDir(path.join(process.cwd(), 'pages'));
  walkDir(path.join(process.cwd(), 'components'));
  console.log(`\n🎉 Audit Complete: ${fixedCount} issue(s) automatically rectified.\n`);
} catch (err) {
  console.error('❌ Error during A11y scan:', err);
  process.exit(1);
}
