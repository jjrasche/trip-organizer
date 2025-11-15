/**
 * Data-Driven Test Runner
 *
 * Executes test cases defined in test-cases.json
 * Supports multiple verification types: UI, database, console, CSS, visual
 */

import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3003';

// Test results tracking
const results = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: null,
  endTime: null,
};

// Console tracking
let consoleMessages = [];

// Screenshot directory
const screenshotDir = path.join(__dirname, '..', 'test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

/**
 * Print formatted section header
 */
function printSection(title, char = '═') {
  console.log('\n' + char.repeat(60));
  console.log(`  ${title}`);
  console.log(char.repeat(60));
}

/**
 * Print test step
 */
function printStep(icon, message, indent = 3) {
  console.log(' '.repeat(indent) + `${icon} ${message}`);
}

/**
 * Execute a single action step
 */
async function executeAction(page, step, testId) {
  switch (step.action) {
    case 'navigate':
      // Replace localhost:3001 with TEST_BASE_URL
      const url = step.target.replace(/http:\/\/localhost:\d+/, TEST_BASE_URL);
      printStep('🌐', `Navigate to ${url}`);
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      return true;

    case 'wait':
      printStep('⏳', `Wait for: ${step.selector}`);
      await page.waitForSelector(step.selector, { timeout: step.timeout || 5000 });
      return true;

    case 'click':
      printStep('👆', `Click: ${step.description || step.selector}`);
      await page.locator(step.selector).click();
      if (step.waitAfter) {
        await page.waitForTimeout(step.waitAfter);
      }
      return true;

    case 'fill':
      printStep('✏️', `Fill "${step.selector}" with: ${step.value}`);
      await page.locator(step.selector).fill(step.value);
      return true;

    case 'select':
      printStep('📋', `Select "${step.value}" in: ${step.selector}`);
      await page.locator(step.selector).selectOption(step.value);
      return true;

    case 'hover':
      printStep('🖱️', `Hover: ${step.selector}`);
      await page.locator(step.selector).hover();
      return true;

    case 'screenshot':
      const screenshotPath = path.join(screenshotDir, `${testId}-${step.name}.png`);
      printStep('📸', `Screenshot: ${step.name}`);
      await page.screenshot({ path: screenshotPath, fullPage: step.fullPage || false });
      return true;

    case 'waitForTimeout':
      printStep('⏱️', `Wait ${step.duration}ms`);
      await page.waitForTimeout(step.duration);
      return true;

    case 'scroll':
      printStep('📜', `Scroll to: ${step.selector}`);
      await page.locator(step.selector).scrollIntoViewIfNeeded();
      return true;

    case 'press':
      printStep('⌨️', `Press key: ${step.key}`);
      await page.keyboard.press(step.key);
      return true;

    default:
      throw new Error(`Unknown action type: ${step.action}`);
  }
}

/**
 * Execute UI verification
 */
async function verifyUI(page, verification) {
  const { selector, assertion, value, count, text, attribute, description, visible } = verification;

  // Handle shorthand: visible: true means assertion: "visible"
  const actualAssertion = visible !== undefined ? (visible ? 'visible' : 'hidden') : assertion;

  switch (actualAssertion) {
    case 'exists':
      const exists = await page.locator(selector).count() > 0;
      if (!exists) throw new Error(`Element not found: ${selector}`);
      printStep('✓', description || `Element exists: ${selector}`, 5);
      return true;

    case 'notExists':
      const notExists = await page.locator(selector).count() === 0;
      if (!notExists) throw new Error(`Element should not exist: ${selector}`);
      printStep('✓', description || `Element does not exist: ${selector}`, 5);
      return true;

    case 'equals':
      if (count !== undefined) {
        const actualCount = await page.locator(selector).count();
        if (actualCount !== count) {
          throw new Error(`Expected ${count} elements, found ${actualCount}`);
        }
        printStep('✓', description || `Count matches: ${actualCount} = ${count}`, 5);
      } else if (text !== undefined) {
        const actualText = await page.locator(selector).textContent();
        if (actualText?.trim() !== text.trim()) {
          throw new Error(`Expected text "${text}", found "${actualText}"`);
        }
        printStep('✓', description || `Text matches: "${text}"`, 5);
      }
      return true;

    case 'contains':
      if (text !== undefined) {
        const actualText = await page.locator(selector).textContent();
        if (!actualText?.includes(text)) {
          throw new Error(`Text "${actualText}" does not contain "${text}"`);
        }
        printStep('✓', description || `Text contains: "${text}"`, 5);
      }
      return true;

    case 'visible':
      const isVisible = await page.locator(selector).isVisible();
      if (!isVisible) throw new Error(`Element not visible: ${selector}`);
      printStep('✓', description || `Element visible: ${selector}`, 5);
      return true;

    case 'hidden':
      const isHidden = !(await page.locator(selector).isVisible());
      if (!isHidden) throw new Error(`Element should be hidden: ${selector}`);
      printStep('✓', description || `Element hidden: ${selector}`, 5);
      return true;

    case 'greaterThan':
      const gtCount = await page.locator(selector).count();
      if (gtCount <= count) {
        throw new Error(`Expected count > ${count}, found ${gtCount}`);
      }
      printStep('✓', description || `Count ${gtCount} > ${count}`, 5);
      return true;

    case 'hasAttribute':
      const attrValue = await page.locator(selector).getAttribute(attribute);
      if (attrValue !== value) {
        throw new Error(`Expected ${attribute}="${value}", found "${attrValue}"`);
      }
      printStep('✓', description || `Attribute ${attribute}="${value}"`, 5);
      return true;

    default:
      throw new Error(`Unknown UI assertion: ${assertion}`);
  }
}

/**
 * Execute database verification
 */
async function verifyDatabase(verification) {
  const { collection: collectionName, documentId, field, value, assertion, description } = verification;

  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Document not found: ${collectionName}/${documentId}`);
  }

  const data = docSnap.data();

  // Navigate nested fields (e.g., "tripIds.length")
  const fieldParts = field.split('.');
  let actualValue = data;
  for (const part of fieldParts) {
    actualValue = actualValue?.[part];
  }

  switch (assertion) {
    case 'equals':
      if (actualValue !== value) {
        throw new Error(`Field ${field}: expected ${value}, found ${actualValue}`);
      }
      printStep('✓', description || `Database: ${field} = ${value}`, 5);
      return true;

    case 'contains':
      if (!Array.isArray(actualValue) || !actualValue.includes(value)) {
        throw new Error(`Field ${field} does not contain ${value}`);
      }
      printStep('✓', description || `Database: ${field} contains ${value}`, 5);
      return true;

    case 'greaterThan':
      if (actualValue <= value) {
        throw new Error(`Field ${field}: expected > ${value}, found ${actualValue}`);
      }
      printStep('✓', description || `Database: ${field} (${actualValue}) > ${value}`, 5);
      return true;

    case 'exists':
      if (actualValue === undefined) {
        throw new Error(`Field ${field} does not exist`);
      }
      printStep('✓', description || `Database: ${field} exists`, 5);
      return true;

    default:
      throw new Error(`Unknown database assertion: ${assertion}`);
  }
}

/**
 * Execute console verification
 */
async function verifyConsole(verification) {
  const { consoleType, contains, count, description } = verification;

  const filteredMessages = consoleMessages.filter(msg =>
    !consoleType || msg.type === consoleType
  );

  if (contains) {
    const found = filteredMessages.some(msg => msg.text.includes(contains));
    if (!found) {
      throw new Error(`Console message containing "${contains}" not found`);
    }
    printStep('✓', description || `Console contains: "${contains}"`, 5);
  }

  if (count !== undefined) {
    if (filteredMessages.length !== count) {
      // Show the actual error messages for debugging
      const errorDetails = filteredMessages.map(msg => msg.text).join('\n     ');
      throw new Error(`Expected ${count} console messages, found ${filteredMessages.length}:\n     ${errorDetails}`);
    }
    printStep('✓', description || `Console message count: ${count}`, 5);
  }

  return true;
}

/**
 * Execute CSS verification
 */
async function verifyCss(page, verification) {
  const { selector, property, value, assertion, description } = verification;

  const element = page.locator(selector).first();
  const computedValue = await element.evaluate((el, prop) => {
    return window.getComputedStyle(el).getPropertyValue(prop);
  }, property);

  switch (assertion) {
    case 'equals':
      if (computedValue !== value) {
        throw new Error(`CSS ${property}: expected "${value}", found "${computedValue}"`);
      }
      printStep('✓', description || `CSS ${property} = "${value}"`, 5);
      return true;

    case 'contains':
      if (!computedValue.includes(value)) {
        throw new Error(`CSS ${property} does not contain "${value}"`);
      }
      printStep('✓', description || `CSS ${property} contains "${value}"`, 5);
      return true;

    default:
      throw new Error(`Unknown CSS assertion: ${assertion}`);
  }
}

/**
 * Execute visual verification (screenshot comparison)
 */
async function verifyVisual(page, verification, testId) {
  const { baseline, threshold = 0.1, description } = verification;
  const currentPath = path.join(screenshotDir, `${testId}-current.png`);

  await page.screenshot({ path: currentPath, fullPage: true });

  // For now, just verify screenshot was taken
  // Future: implement actual image comparison using pixelmatch
  if (fs.existsSync(currentPath)) {
    printStep('✓', description || `Visual snapshot captured`, 5);
    return true;
  }

  throw new Error('Screenshot capture failed');
}

/**
 * Execute all verifications for a test
 */
async function executeVerifications(page, verifications, testId) {
  printStep('✅', 'Verifying results...');

  for (const verification of verifications) {
    try {
      switch (verification.type) {
        case 'ui':
          await verifyUI(page, verification);
          break;
        case 'database':
          await verifyDatabase(verification);
          break;
        case 'console':
          await verifyConsole(verification);
          break;
        case 'css':
          await verifyCss(page, verification);
          break;
        case 'visual':
          await verifyVisual(page, verification, testId);
          break;
        default:
          throw new Error(`Unknown verification type: ${verification.type}`);
      }
    } catch (error) {
      throw new Error(`Verification failed (${verification.type}): ${error.message}`);
    }
  }

  return true;
}

/**
 * Check preconditions
 */
async function checkPreconditions(preconditions) {
  if (preconditions.user) {
    const userDoc = await getDoc(doc(db, 'users', preconditions.user));
    if (!userDoc.exists()) {
      throw new Error(`Precondition failed: User ${preconditions.user} not found`);
    }
    printStep('✓', `User exists: ${preconditions.user}`, 5);
  }

  if (preconditions.trip) {
    const tripDoc = await getDoc(doc(db, 'trips', preconditions.trip));
    if (!tripDoc.exists()) {
      throw new Error(`Precondition failed: Trip ${preconditions.trip} not found`);
    }
    printStep('✓', `Trip exists: ${preconditions.trip}`, 5);
  }

  if (preconditions.minTrips) {
    const userDoc = await getDoc(doc(db, 'users', preconditions.user));
    const tripCount = userDoc.data()?.tripIds?.length || 0;
    if (tripCount < preconditions.minTrips) {
      throw new Error(`Precondition failed: Expected at least ${preconditions.minTrips} trips, found ${tripCount}`);
    }
    printStep('✓', `User has ${tripCount} trips (>= ${preconditions.minTrips})`, 5);
  }

  return true;
}

/**
 * Execute a single test case
 */
async function executeTestCase(page, testCase) {
  const testName = `${testCase.id}: ${testCase.description}`;

  printSection(testName, '─');
  console.log(`   Tags: ${testCase.tags.join(', ')}`);

  try {
    // Clear console tracking
    consoleMessages = [];

    // Check preconditions
    if (testCase.preconditions) {
      printStep('📋', 'Checking preconditions...');
      await checkPreconditions(testCase.preconditions);
    }

    // Execute steps
    printStep('🎬', 'Executing test steps...');
    for (const step of testCase.steps) {
      await executeAction(page, step, testCase.id);
    }

    // Execute verifications
    await executeVerifications(page, testCase.verification, testCase.id);

    // Record success
    results.passed.push({
      id: testCase.id,
      description: testCase.description,
      tags: testCase.tags,
      duration: 0, // TODO: track duration
    });

    printStep('✅', `PASSED: ${testCase.id}`, 0);
    return 'passed';

  } catch (error) {
    // Take failure screenshot
    const failureScreenshot = path.join(screenshotDir, `${testCase.id}-FAILURE.png`);
    try {
      await page.screenshot({ path: failureScreenshot, fullPage: true });
      printStep('📸', `Failure screenshot: ${failureScreenshot}`, 3);
    } catch (screenshotError) {
      // Ignore screenshot errors
    }

    // Record failure
    results.failed.push({
      id: testCase.id,
      description: testCase.description,
      tags: testCase.tags,
      error: error.message,
      screenshot: failureScreenshot,
    });

    printStep('❌', `FAILED: ${error.message}`, 0);
    return 'failed';
  }
}

/**
 * Execute all test cases in a suite
 */
async function executeTestSuite(page, suite) {
  printSection(`Test Suite: ${suite.suite}`, '═');

  for (const testCase of suite.tests) {
    await executeTestCase(page, testCase);
  }
}

/**
 * Print test results summary
 */
function printSummary() {
  printSection('Test Results Summary', '═');

  console.log(`\n   ✅ Passed:  ${results.passed.length}`);
  console.log(`   ❌ Failed:  ${results.failed.length}`);
  console.log(`   ⚠️  Skipped: ${results.skipped.length}`);
  console.log(`   📊 Total:   ${results.passed.length + results.failed.length + results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\n   Failed Tests:');
    results.failed.forEach(test => {
      console.log(`      ❌ ${test.id}: ${test.description}`);
      console.log(`         Error: ${test.error}`);
      console.log(`         Screenshot: ${test.screenshot}`);
    });
  }

  const duration = results.endTime - results.startTime;
  console.log(`\n   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('');
}

/**
 * Generate JSON report
 */
function generateReport() {
  const report = {
    summary: {
      total: results.passed.length + results.failed.length + results.skipped.length,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      duration: results.endTime - results.startTime,
      timestamp: new Date().toISOString(),
    },
    results: {
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
    },
  };

  const reportPath = path.join(screenshotDir, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`   📄 Report saved: ${reportPath}\n`);
}

/**
 * Main test runner
 */
async function runTests() {
  printSection('Data-Driven Test Runner', '═');

  // Load test cases (support command line argument for different test files)
  const testFile = process.argv[2] || 'test-cases.json';
  const testCasesPath = path.join(__dirname, 'test-data', testFile);

  if (!fs.existsSync(testCasesPath)) {
    console.error(`Error: Test file not found: ${testCasesPath}`);
    process.exit(1);
  }

  const testData = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));

  console.log(`   📋 Loaded ${testData.testSuites.length} test suites`);
  console.log(`   📂 Screenshots: ${screenshotDir}\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Slow down for visibility
  });

  const page = await browser.newPage();

  // Setup console tracking
  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  results.startTime = Date.now();

  // Execute all test suites
  for (const suite of testData.testSuites) {
    await executeTestSuite(page, suite);
  }

  results.endTime = Date.now();

  // Cleanup
  await page.waitForTimeout(2000); // Pause to inspect
  await browser.close();

  // Print summary and generate report
  printSummary();
  generateReport();

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
