import puppeteer from 'puppeteer';
const BASE = 'http://localhost:5199';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.gameManagerInstance.openShipPicker());
  await new Promise(r => setTimeout(r, 800));
  await page.keyboard.press('ArrowRight'); await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('ArrowRight'); await new Promise(r => setTimeout(r, 300));

  const data = await page.evaluate(() => {
    const el = document.querySelector('#garage-item-track-paint .color-preset-option[data-color="#ff007f"]');
    const cs = getComputedStyle(el);
    // walk matching CSS rules
    const sheets = Array.from(document.styleSheets);
    const matches = [];
    for (const sheet of sheets) {
      let rules;
      try { rules = sheet.cssRules; } catch(e) { continue; }
      for (const rule of rules) {
        if (rule.selectorText) {
          try {
            if (el.matches(rule.selectorText.split(',')[0].trim()) || el.matches(rule.selectorText)) {
              if (/width|border-radius|height/.test(rule.cssText)) {
                matches.push(rule.cssText.slice(0, 200));
              }
            }
          } catch(e) {}
        }
      }
    }
    return { computedWidth: cs.width, computedHeight: cs.height, computedBorderRadius: cs.borderRadius, matches };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
