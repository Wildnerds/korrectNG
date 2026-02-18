const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use tsx to compile - it's already installed and skips type checking
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Clean dist folder
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Use esbuild via npx for fast transpilation without type checking
try {
  execSync(
    `npx esbuild src/**/*.ts --outdir=dist --platform=node --format=cjs --target=node18`,
    { stdio: 'inherit', cwd: __dirname }
  );
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
