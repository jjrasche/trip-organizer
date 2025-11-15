/**
 * Test AI Chat Feature
 * Interact with AI chat and report what happens
 */
import { chromium } from '@playwright/test';

async function testAIChat() {
  console.log('🤖 Testing AI Chat Feature\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const page = await browser.newContext().then(ctx => ctx.newPage());

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`   ❌ Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`   🔴 Page Error: ${error.message}`);
  });

  try {
    console.log('1️⃣  Loading dashboard...');
    await page.goto('http://localhost:3001', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    console.log('2️⃣  Clicking into Paris trip...');
    await page.locator('[data-testid="trip-card"]').first().click();
    await page.waitForTimeout(2500);

    console.log('3️⃣  Looking for AI chat interface...\n');

    // Look for chat-related elements
    const chatContainer = await page.locator('[data-testid="ai-chat"]').count();
    console.log(`   AI chat container: ${chatContainer > 0 ? 'FOUND ✓' : 'NOT FOUND ✗'}`);

    const chatInput = await page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').count();
    console.log(`   Chat input field: ${chatInput > 0 ? 'FOUND ✓' : 'NOT FOUND ✗'}`);

    const chatButton = await page.locator('button:has-text("Send"), button:has-text("Ask")').count();
    console.log(`   Send button: ${chatButton > 0 ? 'FOUND ✓' : 'NOT FOUND ✗'}`);

    // Look for any AI-related buttons
    const aiButtons = await page.locator('button').allTextContents();
    const aiRelated = aiButtons.filter(text =>
      text.includes('AI') ||
      text.includes('Ask') ||
      text.includes('Chat') ||
      text.includes('💬')
    );

    if (aiRelated.length > 0) {
      console.log(`\n   Found AI-related buttons:`);
      aiRelated.forEach(text => console.log(`     - "${text}"`));
    }

    // Try to find and click any AI trigger
    console.log('\n4️⃣  Trying to activate AI chat...');

    // Look for microphone or chat icon buttons
    const allButtons = await page.locator('button').all();
    let aiChatOpened = false;

    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      if (text && (text.includes('💬') || text.includes('Ask') || text.toLowerCase().includes('chat'))) {
        console.log(`   Clicking button: "${text}"`);
        await allButtons[i].click();
        await page.waitForTimeout(1500);
        aiChatOpened = true;
        break;
      }
    }

    if (!aiChatOpened) {
      console.log('   ⚠️  No AI chat trigger button found');
    }

    // Check if chat input appeared after clicking
    const inputAfterClick = await page.locator('input[type="text"], textarea').count();
    console.log(`\n   Input fields visible after interaction: ${inputAfterClick}`);

    // Try to type in any input we find
    const textInput = page.locator('input[type="text"], textarea').first();
    const hasInput = await textInput.count() > 0;

    if (hasInput) {
      console.log('\n5️⃣  Found input field! Trying to type...');
      await textInput.fill('What activities do we have on day 1?');
      console.log('   ✓ Typed test message');

      await page.screenshot({ path: 'test-ai-input.png', fullPage: true });
      console.log('   📸 Screenshot saved: test-ai-input.png');

      // Look for send button
      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
      const hasSend = await sendBtn.count() > 0;

      if (hasSend) {
        console.log('\n6️⃣  Found send button! Clicking...');
        await sendBtn.click();
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-ai-sent.png', fullPage: true });
        console.log('   📸 Screenshot saved: test-ai-sent.png');

        // Check for response or error
        if (errors.length > 0) {
          console.log('\n   ❌ Errors occurred after sending:');
          errors.forEach((err, i) => {
            console.log(`     ${i + 1}. ${err.substring(0, 150)}`);
          });
        } else {
          console.log('\n   ✓ No errors detected');
        }
      } else {
        console.log('   ⚠️  No send button found');
      }
    } else {
      console.log('\n   ⚠️  No input field found to test with');
    }

    // Final state
    await page.screenshot({ path: 'test-ai-final.png', fullPage: true });
    console.log('\n📸 Final screenshot: test-ai-final.png');

    console.log('\n═══════════════════════════════════════');
    console.log('📊 AI Chat Test Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Total errors captured: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 Errors found:');
      errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err}`);
      });
    }

    console.log('\nBrowser will stay open for 8 seconds...\n');
    await page.waitForTimeout(8000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-ai-error.png' });
  } finally {
    await browser.close();
  }
}

testAIChat();
