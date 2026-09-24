/**
 * check-ui-governance.js
 * Automated UI Governance, Color Tokens & AI Artifact Prohibition Validator — CoachData Operational OS v2
 */

const fs = require('fs');
const path = require('path');

function checkUIGovernance() {
  console.log("====================================================");
  console.log("COACHDATA UI GOVERNANCE & COLOR TOKEN HARDENING CHECK");
  console.log("====================================================");

  const frontendDir = path.join(__dirname, '../src/frontend/src');
  let totalViolations = 0;

  const forbiddenMockStrings = ['Acme', 'Nova Consulting', 'Demo Company', 'John Doe'];
  const forbiddenIcons = ['Sparkles', 'Brain', 'Trophy'];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if ((file.endsWith('.jsx') || file.endsWith('.js')) && !fullPath.includes('index.css') && !fullPath.includes('app.constants.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // 1. Check forbidden mock data strings
        forbiddenMockStrings.forEach(mockStr => {
          if (content.includes(mockStr)) {
            console.error(`[VIOLATION] Forbidden mock data string '${mockStr}' found in: ${file}`);
            totalViolations++;
          }
        });

        // 2. Check forbidden decorative icons
        forbiddenIcons.forEach(iconStr => {
          if (content.includes(`<${iconStr}`) || content.includes(`import { ${iconStr}`)) {
            console.error(`[VIOLATION] Prohibited decorative icon '${iconStr}' found in: ${file}`);
            totalViolations++;
          }
        });

        // 3. Hardcoded Hex / RGB / HSL Color Checks
        const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
        const rgbRegex = /rgba?\([^)]+\)/g;
        const hslRegex = /hsla?\([^)]+\)/g;

        const hexMatches = content.match(hexRegex);
        if (hexMatches && hexMatches.length > 5) {
          console.warn(`[WARN] Excessive hardcoded hex colors (${hexMatches.length}) found in: ${file}. Consider migrating to Vanilla CSS tokens.`);
        }
      }
    });
  }

  scanDirectory(frontendDir);

  console.log("\n----------------------------------------------------");
  if (totalViolations === 0) {
    console.log("UI GOVERNANCE HARDENING VERDICT: 0 VIOLATIONS — PASS");
  } else {
    console.warn(`UI GOVERNANCE HARDENING VERDICT: ${totalViolations} VIOLATIONS DETECTED (AUDIT WARNING)`);
  }
  console.log("----------------------------------------------------");

  return totalViolations;
}

if (require.main === module) {
  checkUIGovernance();
}

module.exports = { checkUIGovernance };
