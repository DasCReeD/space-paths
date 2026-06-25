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
    const track = document.getElementById('garage-item-track-paint');
    const trackRect = track.getBoundingClientRect();
    const trackCS = getComputedStyle(track);
    const items = Array.from(track.querySelectorAll('.garage-item')).map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const thumb = el.querySelector('.garage-item-thumb');
      const thumbR = thumb ? thumb.getBoundingClientRect() : null;
      const nameEl = el.querySelector('.garage-item-name');
      return {
        outerHTML_trunc: el.outerHTML.slice(0, 200),
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        display: cs.display, position: cs.position,
        thumbRect: thumbR ? { top: thumbR.top, left: thumbR.left, width: thumbR.width, height: thumbR.height } : null,
        nameText: nameEl ? nameEl.textContent.trim() : null,
        nameDisplay: nameEl ? getComputedStyle(nameEl).display : null
      };
    });
    return {
      trackRect: { top: trackRect.top, left: trackRect.left, width: trackRect.width, height: trackRect.height },
      trackDisplay: trackCS.display, trackFlexDir: trackCS.flexDirection, trackWidth: trackCS.width,
      items
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
