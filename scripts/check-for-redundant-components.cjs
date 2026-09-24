#!/usr/bin/env node

/**
 * Script: check-for-redundant-components.js
 * Scans the /components directory and checks for naming collisions or 
 * high-level functional overlaps based on component names.
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(process.cwd(), 'components');

// Map of broad categories and keywords to detect potential overlaps
const CATEGORY_MAP = {
  transcript: ['transcript', 'conversation', 'chat'],
  modal: ['modal', 'dialog', 'popup'],
  avatar: ['avatar', 'pulse', 'display'],
};

function auditComponents() {
  const components = fs.readdirSync(COMPONENTS_DIR).filter(file => 
    (file.endsWith('.tsx') || file.endsWith('.jsx'))
  );

  console.log('🔍 Auditing for redundant component categories...');

  const foundCategories = {};

  components.forEach(comp => {
    const nameLower = comp.toLowerCase();
    
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.some(keyword => nameLower.includes(keyword))) {
        if (!foundCategories[category]) foundCategories[category] = [];
        foundCategories[category].push(comp);
      }
    }
  });

  let redundantFound = false;
  for (const [category, files] of Object.entries(foundCategories)) {
    if (files.length > 1) {
      console.warn(`\n⚠️  Redundancy Warning in category [${category.toUpperCase()}]:`);
      files.forEach(file => console.warn(`   - ${file}`));
      redundantFound = true;
    }
  }

  if (!redundantFound) {
    console.log('✅ No obvious redundant component categories found.');
  } else {
    console.log('\n💡 Recommendation: Consolidate functionality or remove obsolete components.');
  }
}

auditComponents();
