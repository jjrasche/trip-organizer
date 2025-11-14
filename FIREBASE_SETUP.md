# Firebase Project Setup Guide

Follow these steps to create and configure your Firebase project.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `trip-organizer` (or your preferred name)
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll deploy our security rules)
4. Select a location (choose closest to your users):
   - `us-central1` (Iowa) - Default
   - `us-east1` (South Carolina)
   - `europe-west1` (Belgium)
   - `asia-northeast1` (Tokyo)
5. Click "Enable"

## Step 3: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Phone** provider:
   - Click "Phone"
   - Toggle "Enable"
   - Click "Save"

**Note**: Phone authentication requires reCAPTCHA for web apps. This is configured automatically.

## Step 4: Register Web App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon `</>`
4. Enter app nickname: `trip-organizer-web`
5. Check "Also set up Firebase Hosting"
6. Click "Register app"
7. **Copy the Firebase config object** (you'll need this for `.env`)

## Step 5: Configure Environment Variables

1. In your project, copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your Firebase config values:
   ```
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=trip-organizer-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=trip-organizer-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=trip-organizer-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

## Step 6: Initialize Firebase CLI

1. Install Firebase CLI globally (or use npx):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```

   Select:
   - ✓ Firestore
   - ✓ Hosting

   Configuration:
   - Use existing project: Select your project
   - Firestore rules file: `firestore.rules` (already exists)
   - Firestore indexes file: `firestore.indexes.json` (already exists)
   - Public directory: `dist`
   - Single-page app: Yes
   - Set up automatic builds with GitHub: No (for now)

## Step 7: Deploy Firestore Rules and Indexes

Deploy the security rules and indexes we created:

```bash
npm run deploy:firestore
```

This deploys:
- `firestore.rules` - Role-based access control
- `firestore.indexes.json` - Query optimization indexes

## Step 8: Verify Setup

1. Check Firestore rules in console:
   - Go to **Firestore Database > Rules**
   - Should see our role-based access rules

2. Check indexes:
   - Go to **Firestore Database > Indexes**
   - Should see composite indexes for trips queries

## Step 9: Test with Emulators (Local Development)

Start Firebase emulators for local testing:

```bash
firebase emulators:start
```

This starts:
- **Firestore Emulator**: http://127.0.0.1:8080
- **Auth Emulator**: http://127.0.0.1:9099
- **Emulator UI**: http://127.0.0.1:4000

Your app automatically connects to emulators in development mode (see `src/config/firebase.ts`).

## Step 10: Configure Phone Authentication Settings (Production)

For production phone auth, configure these settings:

1. **Add authorized domains**:
   - Go to **Authentication > Settings > Authorized domains**
   - Add your production domain

2. **Set up SMS quota** (optional):
   - Go to **Authentication > Settings > SMS quotas**
   - Default: 10 SMS/day per phone number
   - Increase if needed (requires billing account)

3. **Configure reCAPTCHA** (automatic for web):
   - reCAPTCHA v2 is enabled by default
   - For invisible reCAPTCHA, see [Firebase docs](https://firebase.google.com/docs/auth/web/phone-auth)

## Troubleshooting

### Issue: "Missing or insufficient permissions"
- Check that security rules are deployed: `npm run deploy:rules`
- Verify user is authenticated before accessing Firestore

### Issue: "The query requires an index"
- Deploy indexes: `npm run deploy:indexes`
- Or click the link in the error message to auto-create the index

### Issue: "Phone authentication not working"
- Verify Phone provider is enabled in Authentication settings
- Check that domain is in authorized domains list
- For local testing, use emulators: `firebase emulators:start`

### Issue: "Environment variables not loading"
- Check `.env` file exists and has correct values
- Restart dev server after changing `.env`
- Ensure all variables start with `VITE_` prefix

## Next Steps

Once Firebase is set up:

1. **Start development server**: `npm run dev`
2. **Build services layer**: Implement user, trip, and auth services
3. **Build frontend**: Create UI components for authentication and trip management
4. **Deploy**: `npm run build && npm run deploy`

## Useful Commands

```bash
# Deploy everything
npm run deploy

# Deploy only Firestore rules
npm run deploy:rules

# Deploy only Firestore indexes
npm run deploy:indexes

# Start emulators
firebase emulators:start

# View project info
firebase projects:list

# Switch projects
firebase use <project-id>
```
