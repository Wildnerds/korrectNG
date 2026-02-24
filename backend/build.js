const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Clean dist folder
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Find all TypeScript files
const tsFiles = globSync('src/**/*.ts', { cwd: __dirname });
console.log(`Found ${tsFiles.length} TypeScript files to compile`);

if (tsFiles.length === 0) {
  console.error('No TypeScript files found!');
  process.exit(1);
}

// Use esbuild for fast transpilation
try {
  const filesArg = tsFiles.join(' ');
  execSync(
    `npx esbuild ${filesArg} --outdir=dist --platform=node --format=cjs --target=node18`,
    { stdio: 'inherit', cwd: __dirname }
  );

  // Verify server.js was created
  const serverPath = path.join(distDir, 'server.js');
  if (fs.existsSync(serverPath)) {
    console.log('Build completed successfully!');
    console.log(`Server file created at: ${serverPath}`);
  } else {
    console.error('Build completed but server.js was not created!');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
