const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const destPublicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(destPublicDir)) {
  fs.mkdirSync(destPublicDir, { recursive: true });
}

// Check candidate worker files in dist
const candidates = [
  'maplibre-gl-csp-worker.js',
  'maplibre-gl-worker.mjs',
  'maplibre-gl-worker-dev.mjs',
];

let sourceFile = null;
for (const candidate of candidates) {
  const p = path.join(distDir, candidate);
  if (fs.existsSync(p)) {
    sourceFile = p;
    break;
  }
}

if (sourceFile) {
  // Copy to both maplibre-gl-csp-worker.js and maplibre-gl-worker.mjs so all URL patterns match
  fs.copyFileSync(sourceFile, path.join(destPublicDir, 'maplibre-gl-csp-worker.js'));
  fs.copyFileSync(sourceFile, path.join(destPublicDir, 'maplibre-gl-worker.mjs'));
  console.log(`[copy-worker] Copied ${path.basename(sourceFile)} to public/maplibre-gl-csp-worker.js and public/maplibre-gl-worker.mjs`);
} else {
  console.error('[copy-worker] No worker file found in ' + distDir);
  process.exit(1);
}
