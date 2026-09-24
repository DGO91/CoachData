/**
 * clean-build-assets.js
 * Purges obsolete build assets from src/frontend/public/assets while keeping git index clean
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../src/frontend/public/assets');

function cleanAssetsFolder() {
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    console.log(`[CleanAssets] Cleaning ${files.length} files from ${assetsDir}...`);
    files.forEach(file => {
      const filePath = path.join(assetsDir, file);
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`Failed to delete ${filePath}:`, e.message);
      }
    });
    console.log(`[CleanAssets] ${assetsDir} cleaned.`);
  }
}

cleanAssetsFolder();
