import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const inputImage = process.argv[2];
const outputMind = process.argv[3];

if (!inputImage || !outputMind) {
  console.error('Usage: node compile-puppeteer3.mjs <input.png> <output.mind>');
  process.exit(1);
}

const imagePath = path.resolve(inputImage);
const downloadDir = path.dirname(path.resolve(outputMind));
const expectedName = path.basename(outputMind);
const downloadPath = path.join(downloadDir, expectedName);

if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

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

await page.waitForSelector('input.dz-hidden-input', { timeout: 30000 });

console.log('Uploading image...');
const input = await page.$('input.dz-hidden-input');
await input.uploadFile(imagePath);

await page.waitForFunction(() => document.querySelectorAll('.dz-preview').length > 0, { timeout: 30000 });

console.log('Starting compilation...');
await page.click('button.startButton_OY2G');

console.log('Waiting for compilation to complete...');
await page.waitForFunction(() => {
  const btn = document.querySelector('button.startButton_OY2G');
  return btn && btn.textContent.includes('Download');
}, { timeout: 120000 });

console.log('Downloading compiled target...');
await page.click('button.startButton_OY2G');

for (let i = 0; i < 30; i++) {
  if (fs.existsSync(downloadPath)) break;
  await new Promise(r => setTimeout(r, 1000));
}

await browser.close();

if (fs.existsSync(downloadPath)) {
  console.log(`Success: ${downloadPath}`);
} else {
  // The download might have a different name
  const files = fs.readdirSync(downloadDir);
  const mindFiles = files.filter(f => f.endsWith('.mind'));
  if (mindFiles.length > 0) {
    const latest = mindFiles.sort((a, b) => {
      return fs.statSync(path.join(downloadDir, b)).mtime - fs.statSync(path.join(downloadDir, a)).mtime;
    })[0];
    fs.renameSync(path.join(downloadDir, latest), downloadPath);
    console.log(`Success (renamed): ${downloadPath}`);
  } else {
    console.error('Download failed. Files in dir:', files);
    process.exit(1);
  }
}
