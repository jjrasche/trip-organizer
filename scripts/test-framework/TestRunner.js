import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Application } from './ScreenObjects.js';
import dotenv from 'dotenv';

dotenv.config();

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

/**
 * Reusable Test Runner with Screen Objects
 */
export class TestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.app = null;
    this.consoleMessages = [];
    this.screenshotDir = 'test-screenshots';
  }

  async setup() {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    this.app = new Application(this.page);

    // Capture console messages
    this.page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture page errors
    this.page.on('pageerror', (error) => {
      this.consoleMessages.push({
        type: 'error',
        text: error.message,
      });
    });

    // Prime the app by navigating once - this helps with first-test timing
    await this.page.goto('http://localhost:3001');
    // Wait for app to initialize (increased for Firebase loading)
    await this.page.waitForTimeout(3000);
  }

  async teardown() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async screenshot(name) {
    await this.app.screenshot(name);
  }

  getConsoleErrors() {
    return this.consoleMessages.filter(msg => msg.type === 'error');
  }

  clearConsoleMessages() {
    this.consoleMessages = [];
  }

  async verifyDatabase(collection, documentId, field, expectedValue, assertion = 'equals') {
    const docRef = doc(db, collection, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Document ${collection}/${documentId} not found`);
    }

    const data = docSnap.data();
    const fieldPath = field.split('.');
    let actualValue = data;

    for (const key of fieldPath) {
      if (actualValue === undefined || actualValue === null) {
        throw new Error(`Field path ${field} not found in document`);
      }
      actualValue = actualValue[key];
    }

    switch (assertion) {
      case 'equals':
        if (actualValue !== expectedValue) {
          throw new Error(`Expected ${field} to equal ${expectedValue}, got ${actualValue}`);
        }
        break;
      case 'greaterThan':
        if (actualValue <= expectedValue) {
          throw new Error(`Expected ${field} to be > ${expectedValue}, got ${actualValue}`);
        }
        break;
      case 'lessThan':
        if (actualValue >= expectedValue) {
          throw new Error(`Expected ${field} to be < ${expectedValue}, got ${actualValue}`);
        }
        break;
      case 'contains':
        if (!String(actualValue).includes(String(expectedValue))) {
          throw new Error(`Expected ${field} to contain ${expectedValue}, got ${actualValue}`);
        }
        break;
    }

    return actualValue;
  }

  async verifyConsoleErrors(expectedCount = 0) {
    const errors = this.getConsoleErrors();
    if (errors.length !== expectedCount) {
      const errorText = errors.map(e => e.text).join('\n     ');
      throw new Error(`Expected ${expectedCount} console errors, found ${errors.length}:\n     ${errorText}`);
    }
  }
}

/**
 * Test Suite - Organizes related tests
 */
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.runner = null;
  }

  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Test Suite: ${this.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const results = {
      passed: 0,
      failed: 0,
      errors: [],
    };

    for (const test of this.tests) {
      this.runner = new TestRunner();

      try {
        await this.runner.setup();
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`  ${test.name}`);
        console.log(`${'─'.repeat(60)}`);

        await test.testFn(this.runner);

        console.log(`✅ PASSED: ${test.name}`);
        results.passed++;
      } catch (error) {
        console.log(`❌ FAILED: ${test.name}`);
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.errors.push({ test: test.name, error: error.message });
      } finally {
        await this.runner.teardown();
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Test Results Summary`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`   ✅ Passed:  ${results.passed}`);
    console.log(`   ❌ Failed:  ${results.failed}`);
    console.log(`   📊 Total:   ${this.tests.length}\n`);

    if (results.errors.length > 0) {
      console.log(`   Failed Tests:`);
      results.errors.forEach(({ test, error }) => {
        console.log(`      ❌ ${test}`);
        console.log(`         ${error}\n`);
      });
    }

    return results;
  }
}
