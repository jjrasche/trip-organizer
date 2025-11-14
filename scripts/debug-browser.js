// Browser debugging script - captures console errors and page state
import { chromium } from '@playwright/test';

async function debugBrowser() {
  console.log('🔍 Starting browser debugging session...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text, timestamp: new Date().toISOString() });

    const emoji = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      log: '📝',
    }[type] || '📋';

    console.log(`${emoji} [${type.toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.log(`\n🔴 PAGE ERROR:\n${error.message}\n${error.stack}\n`);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    console.log(`\n🌐 REQUEST FAILED: ${request.url()}\n   Error: ${request.failure()?.errorText}\n`);
  });

  try {
    console.log('📱 Navigating to http://localhost:3001...\n');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Wait a moment for React to render
    await page.waitForTimeout(2000);

    // Get page title
    const title = await page.title();
    console.log(`\n📄 Page Title: ${title}`);

    // Check if app rendered
    const bodyText = await page.textContent('body');
    console.log(`\n📋 Page contains text: ${bodyText.substring(0, 200)}...\n`);

    // Take screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to debug-screenshot.png\n');

    // Get all errors
    const errors = consoleMessages.filter((m) => m.type === 'error');
    const warnings = consoleMessages.filter((m) => m.type === 'warning');

    console.log('\n═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 ERRORS FOUND:');
      errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.text}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS FOUND:');
      warnings.forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn.text}`);
      });
    }

    // Keep browser open for manual inspection
    console.log('\n\n✅ Browser debugging complete!');
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error during debugging:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

debugBrowser();
