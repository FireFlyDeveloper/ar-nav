import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const inputImage = process.argv[2];
const outputMind = process.argv[3];

if (!inputImage || !outputMind) {
  console.error('Usage: node compile-puppeteer.mjs <input.png> <output.mind>');
  process.exit(1);
}

const imagePath = path.resolve(inputImage);
const downloadDir = path.dirname(path.resolve(outputMind));

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

// Handle download
const client = await page.target().createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: downloadDir,
});

console.log('Opening MindAR compiler...');
await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile/', {
  waitUntil: 'networkidle2',
  timeout: 60000,
});

// Wait for the file input
await page.waitForSelector('input[type="file"]', { timeout: 30000 });

console.log('Uploading image...');
const input = await page.$('input[type="file"]');
await input.uploadFile(imagePath);

// Wait for compile button and click it
await page.waitForFunction(() => {
  const btn = document.querySelector('button');
  return btn && !btn.disabled && btn.textContent.includes('Start');
}, { timeout: 30000 });

console.log('Starting compilation...');
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start'));
  if (btn) btn.click();
});

// Wait for download to appear
const expectedName = path.basename(outputMind);
const downloadPath = path.join(downloadDir, expectedName);

console.log('Waiting for compilation to complete...');
await page.waitForFunction(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Download'));
  return btn && !btn.disabled;
}, { timeout: 120000 });

console.log('Downloading .mind file...');
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Download'));
  if (btn) btn.click();
});

// Wait for file to appear
for (let i = 0; i < 30; i++) {
  if (fs.existsSync(downloadPath)) break;
  await new Promise(r => setTimeout(r, 1000));
}

await browser.close();

if (fs.existsSync(downloadPath)) {
  console.log(`Success: ${downloadPath}`);
} else {
  console.error('Download failed or file not found');
  process.exit(1);
}
