// scripts/security-audit.js
const fs = require('fs');
const path = require('path');

console.log('🔍 CoachData Security Audit v0.5.1\n');

let failed = false;

function checkFileForTerms(filePath, forbiddenTerms) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  forbiddenTerms.forEach(({ term, reason }) => {
    if (content.includes(term)) {
      console.error(`❌ SECURITY ERROR in ${filePath}: ${reason} (Found "${term}")`);
      failed = true;
    }
  });
}

function scanDirectory(dir, forbiddenTerms) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, forbiddenTerms);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      checkFileForTerms(fullPath, forbiddenTerms);
    }
  }
}

// 1. Audit Frontend Directory for Secret Leaks
const frontendDir = path.join(__dirname, '../src/frontend/src');
const frontendForbidden = [
  { term: 'SUPABASE_SERVICE_ROLE_KEY', reason: 'Service Role Key in frontend code' },
  { term: 'OPENAI_API_KEY', reason: 'OpenAI Secret Key in frontend code' },
  { term: 'ANTHROPIC_API_KEY', reason: 'Anthropic Secret Key in frontend code' },
  { term: 'GEMINI_API_KEY', reason: 'Gemini Secret Key in frontend code' },
  { term: '/api/credentials', reason: 'Legacy insecure endpoint reference in frontend' },
  { term: 'SUPABASE_KEY', reason: 'Legacy SUPABASE_KEY variable name' },
];

scanDirectory(frontendDir, frontendForbidden);

// 2. Audit Backend Infrastructure for /api/credentials
const backendAppFile = path.join(__dirname, '../src/backend/infrastructure/web/app.js');
checkFileForTerms(backendAppFile, [
  { term: 'credentialsRoutes', reason: 'Legacy insecure credentials route imported' },
]);

if (failed) {
  console.error('\n🔴 SECURITY AUDIT FAILED: Please fix the errors above before deploying.');
  process.exit(1);
} else {
  console.log('✅ No frontend secret leaks detected');
  console.log('✅ No legacy SUPABASE_KEY references');
  console.log('✅ No /api/credentials references');
  console.log('✅ Environment separation validated\n');
  console.log('🟢 SECURITY AUDIT PASSED');
  process.exit(0);
}
