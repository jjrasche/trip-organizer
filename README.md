# Trip Organizer

Multi-user collaborative trip organizer with real-time sync, built with Firebase and TypeScript.

## Architecture

- **Database**: Firestore (Google's managed NoSQL)
- **Authentication**: Firebase Auth (phone number-based)
- **Real-time sync**: Built-in Firestore listeners
- **Offline support**: Automatic via IndexedDB
- **Hosting**: Firebase Hosting (or serverless containers)

## Features

- Phone number authentication (SMS verification)
- Real-time collaborative trip editing
- Role-based access control (Owner, Editor, Viewer)
- Offline-first architecture
- Multi-location trips (locations stored per-activity)
- Cost tracking and splitting
- File attachments for activities

## Project Structure

```
trip-organizer/
├── src/
│   ├── types/           # TypeScript entity definitions
│   │   ├── user.ts
│   │   ├── participant.ts
│   │   ├── activity.ts
│   │   ├── day.ts
│   │   ├── trip.ts
│   │   ├── presence.ts
│   │   └── index.ts
│   └── config/
│       └── firebase.ts  # Firebase initialization
├── firestore.rules      # Security rules (role-based access)
├── firestore.indexes.json  # Database indexes
├── firebase.json        # Firebase configuration
└── package.json
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication > Phone provider
5. Get your web app credentials

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials from the console.

### 4. Deploy Firestore rules and indexes

```bash
npm run deploy:firestore
```

### 5. Run development server

```bash
npm run dev
```

## Firebase Emulators (Local Development)

Run Firebase emulators for local development:

```bash
firebase emulators:start
```

This starts:
- Firestore emulator on port 8080
- Auth emulator on port 9099
- Emulator UI on port 4000

The app automatically connects to emulators in development mode.

## Security Rules

Firestore security rules enforce:

- **Users**: Can only read/update their own profile
- **Trips**:
  - Public trips readable via share token
  - Participants can read trips they're part of
  - Owners and Editors can update trip details
  - Editors can manage participants (add/remove, change roles)
  - Only Owners can delete trips
- **Presence**: Participants can read/write presence data for trips they're in

## Deployment

### Deploy to Firebase Hosting

```bash
npm run build
npm run deploy
```

### Deploy only Firestore rules

```bash
npm run deploy:rules
```

### Deploy only Firestore indexes

```bash
npm run deploy:indexes
```

## Data Model

See `SCHEMA.md` for detailed schema documentation.

### Collections

- `users/{userId}` - User profiles (phone number-based)
- `trips/{tripId}` - Self-contained trip documents with nested days and activities
- `trips/{tripId}/presence/{userId}` - Ephemeral presence data

### Roles

- **Owner**: Full control, can delete trip
- **Editor**: Can edit everything and manage participants, cannot delete trip
- **Viewer**: Read-only access

## Cost Estimates

Based on Firestore pricing:

- **1,000 active users**: ~$5-10/month
- **10,000 active users**: ~$50-100/month
- **100,000 active users**: ~$500-1000/month

See `SCHEMA.md` for detailed cost analysis vs self-managed solutions.

## License

Private
