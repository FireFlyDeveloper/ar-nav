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

// Wait a bit then dump buttons
await new Promise(r => setTimeout(r, 5000));

const buttons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button, a')).map(el => ({
    tag: el.tagName,
    text: el.textContent?.trim()?.substring(0, 100),
    class: el.className,
    disabled: el.disabled,
  }))
);
console.log(JSON.stringify(buttons, null, 2));

// Also check for any anchor with download
const links = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a[download]')).map(el => ({
    text: el.textContent?.trim(),
    href: el.href,
    download: el.download,
  }))
);
console.log('\n--- Download links ---');
console.log(JSON.stringify(links, null, 2));

await browser.close();
