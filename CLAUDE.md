# Claude Code - Development Guide & Patterns

This document contains patterns, solutions, and approaches that worked well for this project and should be reused in future development sessions.

---

# Automated Browser Testing

## Problem Solved
When users report browser console errors but don't want to manually paste them, we can use **Playwright** to automatically inspect the browser and capture all console output.

## Setup

### 1. Install Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

### 2. Create Debug Script
File: `scripts/debug-browser.js`

```javascript
import { chromium } from '@playwright/test';

async function debugBrowser() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', (msg) => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    console.log(`REQUEST FAILED: ${request.url()}`);
  });

  // Navigate and inspect
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'debug-screenshot.png' });

  await browser.close();
}

debugBrowser();
```

### 3. Add npm Script
In `package.json`:
```json
{
  "scripts": {
    "test:debug": "node scripts/debug-browser.js"
  }
}
```

## Usage

```bash
npm run test:debug
```

This will:
1. Open a browser window
2. Navigate to your app
3. Capture ALL console messages (errors, warnings, logs)
4. Take a screenshot
5. Report findings to terminal

## What We Found & Fixed

### Issue 1: Emulator Connection Error
**Problem:** App tried to connect to Firebase emulator (127.0.0.1:8080) but emulator wasn't running

**Error:**
```
Access to fetch at 'http://127.0.0.1:8080/...' has been blocked by CORS policy
```

**Fix:** Disabled emulator connection in development
```typescript
// src/config/firebase.ts
// Commented out emulator connection:
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
//   connectFirestoreEmulator(db, '127.0.0.1', 8080);
// }
```

### Issue 2: Missing Firestore Index
**Problem:** Query required a composite index that wasn't deployed

**Error:**
```
The query requires an index. You can create it here: [Firebase Console URL]
```

**Fix:** Simplified query to avoid index requirement
```typescript
// Before (required index):
const q = query(
  tripsRef,
  where('participants', 'array-contains', { userId }),
  orderBy('startDate', 'desc')  // Causes composite index requirement
);

// After (no index needed):
const q = query(
  tripsRef,
  where('participants', 'array-contains', { userId })
);
const trips = await getDocs(q);
// Sort client-side instead
return trips.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
```

## Benefits

✅ **See exactly what users see** - All console errors captured
✅ **Screenshots** - Visual proof of state
✅ **No manual copying** - Automated error collection
✅ **Fast debugging** - Identify issues in seconds
✅ **Repeatable** - Run anytime code changes

## Future Improvements

- Add test assertions
- Run in CI/CD pipeline
- Test multiple browsers (Firefox, Safari)
- Capture network requests
- Test different screen sizes

## Cost

- **Time to setup:** 5 minutes
- **Time to run:** ~10-15 seconds per test
- **Dependencies:** @playwright/test (~150MB for Chromium)

## When to Use

- User reports errors but can't/won't paste them
- Need to verify fixes work in real browser
- Want to catch errors before deployment
- Testing real-time features (WebSockets, Firebase listeners)
- Debugging CORS, network, or auth issues

---

# Firebase + TypeScript Patterns

## Firebase AI Logic SDK Setup

### Problem
Firebase's AI Logic SDK isn't well-documented for web. Import paths are confusing.

### Solution
```typescript
// ✅ CORRECT import path
import { getAI, getGenerativeModel } from 'firebase/ai';
import { app } from '../config/firebase';

// Initialize AI (no API key needed in code!)
const ai = getAI(app);

// Get Gemini model
const model = getGenerativeModel(ai, {
  model: 'gemini-2.0-flash-exp'
});

// Generate content
const result = await model.generateContent(prompt);
const text = result.response.text();
```

### Key Points
- Use `firebase/ai` NOT `@google/generative-ai`
- No API key in code - managed by Firebase
- Enable in Firebase Console: AI > Firebase AI Logic > Gemini Developer API
- Free tier: 15 requests/min, 1M tokens/day

## Development Mode Auth Bypass

### Problem
Need to test app without implementing full phone authentication flow.

### Solution
```typescript
// src/App.tsx
const DEV_MODE = import.meta.env.DEV;
const TEST_USER_ID = 'test-user-415-301-8471';

useEffect(() => {
  if (DEV_MODE) {
    const mockUser = {
      uid: TEST_USER_ID,
      phoneNumber: '+14153018471',
      displayName: 'Test User',
    } as FirebaseUser;

    setCurrentUser(mockUser);
    setView({ type: 'dashboard' });
    setLoading(false);
    return;
  }

  // Production auth flow...
}, []);
```

### Key Points
- Only active in development (`import.meta.env.DEV`)
- User must exist in Firestore
- Remove before production deployment

## Firestore Query Optimization

### Problem
Composite indexes can fail to deploy or take time to build.

### Solution
**Avoid composite indexes by sorting client-side:**

```typescript
// ❌ BAD: Requires composite index
const q = query(
  collection(db, 'trips'),
  where('participants', 'array-contains', { userId }),
  orderBy('startDate', 'desc')  // Composite index needed!
);

// ✅ GOOD: Single-field index only
const q = query(
  collection(db, 'trips'),
  where('participants', 'array-contains', { userId })
);
const trips = await getDocs(q);

// Sort client-side
return trips.sort((a, b) =>
  b.startDate.toMillis() - a.startDate.toMillis()
);
```

### When to Use
- Small datasets (<1000 docs per query)
- Development/testing phase
- When index deployment fails

### When NOT to Use
- Large datasets (>1000 docs)
- Production with many users
- Performance-critical queries

## Firestore Security Rules - Development

### Problem
Need to test Firestore writes before authentication is implemented.

### Solution - Development Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT ONLY
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Deployment
```bash
npx firebase deploy --only firestore:rules
```

### ⚠️ WARNING
- **NEVER use in production**
- Replace with proper role-based rules before launch
- Keep production rules in `firestore.rules.prod`

## Creating Test Data

### Problem
Need test users/data in Firestore to develop against.

### Solution
```typescript
// scripts/create-test-user.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userData = {
  userId: 'test-user-id',
  phoneNumber: '+14153018471',
  displayName: 'Test User',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  tripIds: [],
};

await setDoc(doc(db, 'users', 'test-user-id'), userData);
```

Run with: `npx tsx scripts/create-test-user.ts`

### Key Points
- Don't use `undefined` values - Firestore rejects them
- Use `serverTimestamp()` for timestamps
- Run AFTER deploying permissive dev rules

---

# Project Architecture Decisions

## Tech Stack Rationale

### Firebase AI Logic vs Self-Managed LLM
**Decision:** Firebase AI Logic (Gemini)

**Why:**
- No API key management in code (more secure)
- $0.075 per 1M tokens (very cheap)
- Built-in rate limiting and abuse protection
- Auto-scales
- Free tier: 15 req/min, 1M tokens/day

**Alternative Considered:**
- Direct Gemini API: Requires API key in code (less secure)
- OpenAI: 2x more expensive
- Self-hosted: 100x development cost

### Firestore vs Self-Managed Database
**Decision:** Firestore (managed NoSQL)

**Why:**
- Real-time sync built-in (would take 2-4 weeks to build)
- Offline support automatic (would take 2-3 weeks to build)
- $5-10/month for first 1K users
- Zero DevOps overhead
- Break-even: 20-30 years vs self-managed (when factoring dev time)

**Cost Comparison:**
- Firestore: $5-10/month (first 1K users)
- PostgreSQL + Redis + Cloud Run: $40-80/month + $20K-30K dev cost
- Self-managed becomes cheaper only at 10K+ active users

### Phone Number Authentication
**Decision:** Phone-first (not email)

**Why:**
- App is organization/coordination tool
- Real-time communication via SMS needed
- Easier for group coordination (everyone has phone)
- Lower friction than email verification

### Document-Based Schema (No Separate Collections)
**Decision:** Trips contain nested days and activities

**Why:**
- Trips are self-contained (no cross-trip queries needed)
- Single document = single real-time listener
- Faster reads (one query gets everything)
- Fits in 1MB Firestore limit easily (typical trip ~50-100KB)

**Trade-off:**
- More complex writes when updating nested data
- Acceptable because reads >> writes in this app

---

# Common Pitfalls & Solutions

## Vite Import Issues

### Problem
`Missing "./ai" specifier in "firebase" package`

### Cause
Vite caching or package.json exports not recognized

### Solution
1. Check if export exists: `cat node_modules/firebase/package.json | grep "./ai"`
2. Restart dev server
3. Clear node_modules and reinstall if needed

## Firebase Emulator CORS Errors

### Problem
```
Access to fetch at 'http://127.0.0.1:8080/...' blocked by CORS
```

### Cause
App configured to use emulator but emulator not running

### Solutions
**Option 1:** Run emulator
```bash
firebase emulators:start
```

**Option 2:** Disable emulator connection (use production)
```typescript
// src/config/firebase.ts
// Comment out these lines:
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
//   connectFirestoreEmulator(db, '127.0.0.1', 8080);
// }
```

## Firestore "Client is offline" Errors

### Cause
1. Emulator not running (when configured)
2. Network issue
3. Firestore rules blocking access

### Debug Steps
1. Check browser console for CORS errors
2. Check Network tab for failed requests
3. Verify Firestore rules allow access
4. Check if emulator is enabled in config

---

# Useful Commands

## Firebase
```bash
# Login
npx firebase login

# Deploy everything
npx firebase deploy

# Deploy only rules
npx firebase deploy --only firestore:rules

# Deploy only indexes
npx firebase deploy --only firestore:indexes

# Start emulators
firebase emulators:start
```

## Development
```bash
# Run dev server
npm run dev

# Debug browser (automated testing)
npm run test:debug

# Create test data
npx tsx scripts/create-test-user.ts

# Install Playwright browsers
npx playwright install chromium
```

## Debugging
```bash
# Check Firebase package structure
ls node_modules/firebase/

# Check specific export
cat node_modules/firebase/package.json | grep -A 5 '"./ai"'

# Check installed versions
npm list firebase
npm list @playwright/test
```

---

# File Structure Reference

```
trip-organizer/
├── src/
│   ├── types/              # TypeScript entity definitions
│   │   ├── user.ts         # User entity
│   │   ├── trip.ts         # Trip entity (main)
│   │   ├── activity.ts     # Activity entity
│   │   ├── participant.ts  # Participant roles
│   │   └── index.ts        # Central export
│   ├── services/           # Business logic layer
│   │   ├── auth.service.ts # Phone authentication
│   │   ├── user.service.ts # User CRUD
│   │   ├── trip.service.ts # Trip CRUD + real-time
│   │   ├── ai.service.ts   # Gemini AI integration
│   │   └── presence.service.ts # Real-time presence
│   ├── pages/              # React pages
│   │   ├── AuthPage.tsx    # Phone auth UI
│   │   ├── Dashboard.tsx   # My trips
│   │   └── TripDetail.tsx  # Trip view + AI chat
│   ├── components/         # React components
│   │   └── AIChat.tsx      # AI chat interface
│   └── config/
│       └── firebase.ts     # Firebase initialization
├── scripts/
│   ├── debug-browser.js    # Playwright automated testing
│   └── create-test-user.ts # Test data creation
├── firestore.rules         # Security rules (dev: open, prod: role-based)
├── firestore.indexes.json  # Database indexes
├── firebase.json           # Firebase config
└── CLAUDE.md              # This file
```

---

# Quick Start Checklist for Future Sessions

When resuming work on this project:

- [ ] Run `npm install` to ensure dependencies are current
- [ ] Start dev server: `npm run dev`
- [ ] Check if emulator is needed or disabled
- [ ] Run `npm run test:debug` to verify app loads without errors
- [ ] Check Firebase Console for any API quotas/limits
- [ ] Review `SCHEMA.md` for data model
- [ ] Review this file for patterns and solutions

---

**Created:** 2025-11-14
**Last Updated:** 2025-11-14
**Status:** ✅ Complete - Ready for future development
**Next Steps:** Implement Create Trip UI, Enable Firebase AI Logic for chat
