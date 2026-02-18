const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create an SVG icon with the KorrectNG branding
function createSvgIcon(size) {
  const fontSize = Math.floor(size * 0.35);
  const padding = Math.floor(size * 0.15);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22C55E;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16A34A;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}px"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >K</text>
    </svg>
  `;
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const svg = createSvgIcon(size);
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Also create apple-touch-icon
  const appleSvg = createSvgIcon(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  // Create favicon
  const faviconSvg = createSvgIcon(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(__dirname, '../public/favicon.ico'));
  console.log('  Created: favicon.ico');

  console.log('\nDone! Icons generated successfully.');
  console.log('Note: Replace these placeholder icons with your actual logo for production.');
}

generateIcons().catch(console.error);
