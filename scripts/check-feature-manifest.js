#!/usr/bin/env node

/**
 * Script: check-feature-manifest.js
 * Compares requested features against the feature-manifest.json
 * to prevent duplicate implementations.
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(process.cwd(), 'feature-manifest.json');

function checkFeature(featureName) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('⚠️ Manifest not found. Skipping check.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  if (manifest.features[featureName]) {
    const feature = manifest.features[featureName];
    console.warn(`\n⚠️  Feature [${featureName}] already exists:`);
    console.warn(`   Status: ${feature.status}`);
    console.warn(`   Components: ${feature.components.join(', ')}`);
    console.warn(`\n💡 Recommendation: Do not re-implement. Reuse or extend existing components.`);
    process.exit(1); // Stop execution
  } else {
    console.log(`✅ Feature [${featureName}] is not yet implemented. Proceeding...`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/check-feature-manifest.js <feature_name>');
} else {
  checkFeature(args[0]);
}
