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

const html = await page.content();
console.log(html.substring(0, 3000));

const buttons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button, input, a')).map(el => ({
    tag: el.tagName,
    type: el.type,
    text: el.textContent?.trim()?.substring(0, 100),
    id: el.id,
    class: el.className,
  }))
);
console.log('\n--- Elements ---');
console.log(JSON.stringify(buttons, null, 2));

await browser.close();
