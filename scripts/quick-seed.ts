/**
 * Quick seed script - creates test data directly
 * Uses manual Firebase init to avoid Vite dependencies
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Firebase config from .env
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

async function seed() {
  console.log('🚀 Quick seeding test data...\n');

  const now = Timestamp.now();

  // Create user 1
  const user1Data = {
    userId: 'test-user-415-301-8471',
    phoneNumber: '+14153018471',
    displayName: 'Test User',
    createdAt: now,
    updatedAt: now,
    tripIds: ['trip-paris-2025', 'trip-tokyo-2024'],
  };

  await setDoc(doc(db, 'users', user1Data.userId), user1Data);
  console.log('✅ Created user: Test User');

  // Create Paris trip
  const parisTrip = {
    tripId: 'trip-paris-2025',
    title: 'Paris Adventure 2025',
    description: 'A week exploring the City of Light',
    startDate: Timestamp.fromDate(new Date('2025-12-15')),
    endDate: Timestamp.fromDate(new Date('2025-12-22')),
    participants: [
      {
        userId: 'test-user-415-301-8471',
        phoneNumber: '+14153018471',
        displayName: 'Test User',
        role: 'owner',
        joinedAt: now,
      },
    ],
    days: [
      {
        dayId: 'day-1',
        date: Timestamp.fromDate(new Date('2025-12-15')),
        title: 'Arrival Day',
        activities: [
          {
            activityId: 'act-1',
            title: 'Arrive at CDG Airport',
            description: 'Flight lands at 9:30 AM',
            type: 'travel',
            startTime: '09:30',
            endTime: '10:00',
            location: {
              name: 'Charles de Gaulle Airport',
              address: '95700 Roissy-en-France, France',
            },
            createdBy: 'test-user-415-301-8471',
            createdAt: now,
            updatedBy: 'test-user-415-301-8471',
            updatedAt: now,
            attachments: [],
          },
          {
            activityId: 'act-2',
            title: 'Hotel Check-in',
            type: 'accommodation',
            startTime: '14:00',
            endTime: '15:00',
            location: {
              name: 'Hotel Le Marais',
              address: '12 Rue de Rivoli, 75004 Paris',
            },
            createdBy: 'test-user-415-301-8471',
            createdAt: now,
            updatedBy: 'test-user-415-301-8471',
            updatedAt: now,
            attachments: [],
          },
        ],
      },
      {
        dayId: 'day-2',
        date: Timestamp.fromDate(new Date('2025-12-16')),
        title: 'Exploring Paris',
        activities: [
          {
            activityId: 'act-3',
            title: 'Visit Eiffel Tower',
            description: 'Tickets for 10 AM',
            type: 'activity',
            startTime: '10:00',
            endTime: '12:30',
            location: {
              name: 'Eiffel Tower',
              address: 'Champ de Mars, 75007 Paris',
              coordinates: { latitude: 48.8584, longitude: 2.2945 },
            },
            notes: 'Arrive 15 min early',
            createdBy: 'test-user-415-301-8471',
            createdAt: now,
            updatedBy: 'test-user-415-301-8471',
            updatedAt: now,
            attachments: [],
          },
        ],
      },
    ],
    coverImageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
    createdBy: 'test-user-415-301-8471',
    createdAt: now,
    updatedAt: now,
    settings: {
      currency: 'EUR',
      timezone: 'Europe/Paris',
      isPublic: false,
    },
  };

  await setDoc(doc(db, 'trips', parisTrip.tripId), parisTrip);
  console.log('✅ Created trip: Paris Adventure 2025');

  // Create Tokyo trip (past)
  const tokyoTrip = {
    tripId: 'trip-tokyo-2024',
    title: 'Tokyo Trip 2024',
    description: 'Amazing week in Japan',
    startDate: Timestamp.fromDate(new Date('2024-10-01')),
    endDate: Timestamp.fromDate(new Date('2024-10-08')),
    participants: [
      {
        userId: 'test-user-415-301-8471',
        phoneNumber: '+14153018471',
        displayName: 'Test User',
        role: 'owner',
        joinedAt: now,
      },
    ],
    days: [],
    createdBy: 'test-user-415-301-8471',
    createdAt: now,
    updatedAt: now,
    settings: {
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      isPublic: false,
    },
  };

  await setDoc(doc(db, 'trips', tokyoTrip.tripId), tokyoTrip);
  console.log('✅ Created trip: Tokyo Trip 2024');

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Seeding complete!\n');
  console.log('Created:');
  console.log('  - 1 user');
  console.log('  - 2 trips');
  console.log('  - 2 days');
  console.log('  - 3 activities\n');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
