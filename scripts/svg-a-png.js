const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const DIR = '/Users/diogenesg.o/CLIENTES SAAS/screenshots-linkedin';
(async () => {
  const nav = await chromium.launch();
  for (const [f, w, h] of [['architecture', 1600, 1060], ['data-model', 1600, 1000]]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto('file://' + path.join(DIR, f + '.svg'));
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(DIR, f + '.png') });
    console.log(`  ✓ ${f}.png  ${Math.round(fs.statSync(path.join(DIR, f + '.png')).size / 1024)} KB  (${w*2}x${h*2})`);
    await ctx.close();
  }
  await nav.close();
})();
