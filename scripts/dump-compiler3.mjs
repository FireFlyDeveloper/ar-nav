import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile/', {
  waitUntil: 'networkidle2',
  timeout: 60000,
});

await page.waitForSelector('input.dz-hidden-input', { timeout: 30000 });
const input = await page.$('input.dz-hidden-input');
await input.uploadFile('/root/.worktrees/t_e9bb9af0/public/targets/QR_A1.png');

await page.waitForFunction(() => document.querySelectorAll('.dz-preview').length > 0, { timeout: 30000 });

console.log('Clicking Start...');
await page.click('button.startButton_OY2G');

// Wait up to 90 seconds, checking every 5 seconds
for (let t = 0; t < 18; t++) {
  await new Promise(r => setTimeout(r, 5000));
  
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a')).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim()?.substring(0, 100),
      class: el.className,
      disabled: el.disabled,
    }))
  );
  
  const progress = await page.evaluate(() => {
    const el = document.querySelector('.progress');
    return el ? el.textContent : null;
  });
  
  console.log(`\n--- t=${(t+1)*5}s ---`);
  console.log('Progress:', progress);
  console.log('Buttons:', JSON.stringify(buttons.filter(b => b.tag === 'BUTTON' && b.text), null, 2));
  
  const downloadLink = buttons.find(b => b.text && b.text.toLowerCase().includes('download'));
  if (downloadLink) break;
}

await browser.close();
