import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const inputImage = process.argv[2];
const outputMind = process.argv[3];

if (!inputImage || !outputMind) {
  console.error('Usage: node compile-puppeteer2.mjs <input.png> <output.mind>');
  process.exit(1);
}

const imagePath = path.resolve(inputImage);
const downloadDir = path.dirname(path.resolve(outputMind));
const expectedName = path.basename(outputMind);
const downloadPath = path.join(downloadDir, expectedName);

// Clean up old download
if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);

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

// Wait for dropzone input
await page.waitForSelector('input.dz-hidden-input', { timeout: 30000 });

console.log('Uploading image...');
const input = await page.$('input.dz-hidden-input');
await input.uploadFile(imagePath);

// Wait for the image to be accepted (dropzone adds a preview)
await page.waitForFunction(() => {
  return document.querySelectorAll('.dz-preview').length > 0;
}, { timeout: 30000 });

// Wait for Start button to be visible/enabled
await page.waitForSelector('button.startButton_OY2G', { visible: true, timeout: 30000 });

console.log('Starting compilation...');
await page.click('button.startButton_OY2G');

// Wait for download button to appear
console.log('Waiting for compilation...');
await page.waitForFunction(() => {
  const btn = document.querySelector('button.downloadButton');
  return btn && !btn.disabled;
}, { timeout: 120000 });

console.log('Downloading .mind file...');
await page.click('button.downloadButton');

// Wait for download
for (let i = 0; i < 30; i++) {
  if (fs.existsSync(downloadPath)) break;
  await new Promise(r => setTimeout(r, 1000));
}

await browser.close();

if (fs.existsSync(downloadPath)) {
  console.log(`Success: ${downloadPath}`);
} else {
  console.error('Download failed or file not found');
  // List files in download dir
  console.log('Files in dir:', fs.readdirSync(downloadDir));
  process.exit(1);
}
