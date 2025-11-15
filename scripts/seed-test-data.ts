/**
 * Seed test data for development and testing
 * Creates test users and sample trips with realistic data
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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

// Test users
const testUsers = [
  {
    userId: 'test-user-415-301-8471',
    phoneNumber: '+14153018471',
    displayName: 'Test User',
  },
  {
    userId: 'test-user-415-555-0001',
    phoneNumber: '+14155550001',
    displayName: 'Alice Smith',
  },
  {
    userId: 'test-user-415-555-0002',
    phoneNumber: '+14155550002',
    displayName: 'Bob Johnson',
  },
];

async function seedUsers() {
  console.log('🌱 Seeding test users...\n');

  for (const user of testUsers) {
    const userData = {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tripIds: [],
    };

    await setDoc(doc(db, 'users', user.userId), userData);
    console.log(`✅ Created user: ${user.displayName} (${user.phoneNumber})`);
  }

  console.log('\n');
}

async function seedTrips() {
  console.log('🌱 Seeding test trips...\n');

  const now = Timestamp.now();

  // Trip 1: Upcoming trip to Paris
  const trip1 = {
    tripId: 'trip-paris-2025',
    title: 'Paris Adventure 2025',
    description: 'A week exploring the City of Light with friends',
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
      {
        userId: 'test-user-415-555-0001',
        phoneNumber: '+14155550001',
        displayName: 'Alice Smith',
        role: 'editor',
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
            description: 'Check in at Hotel Le Marais',
            type: 'accommodation',
            startTime: '14:00',
            endTime: '15:00',
            location: {
              name: 'Hotel Le Marais',
              address: '12 Rue de Rivoli, 75004 Paris, France',
            },
            createdBy: 'test-user-415-301-8471',
            createdAt: now,
            updatedBy: 'test-user-415-301-8471',
            updatedAt: now,
            attachments: [],
          },
          {
            activityId: 'act-3',
            title: 'Dinner at Le Comptoir',
            type: 'dining',
            startTime: '19:30',
            endTime: '21:30',
            location: {
              name: 'Le Comptoir du Relais',
              address: '9 Carrefour de l\'Odéon, 75006 Paris, France',
            },
            cost: {
              amount: 120,
              currency: 'EUR',
              paidBy: 'test-user-415-301-8471',
              splitBetween: ['test-user-415-301-8471', 'test-user-415-555-0001'],
            },
            createdBy: 'test-user-415-555-0001',
            createdAt: now,
            updatedBy: 'test-user-415-555-0001',
            updatedAt: now,
            attachments: [],
          },
        ],
      },
      {
        dayId: 'day-2',
        date: Timestamp.fromDate(new Date('2025-12-16')),
        title: 'Exploring Central Paris',
        activities: [
          {
            activityId: 'act-4',
            title: 'Visit Eiffel Tower',
            description: 'Pre-booked tickets for 10 AM',
            type: 'activity',
            startTime: '10:00',
            endTime: '12:30',
            location: {
              name: 'Eiffel Tower',
              address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
              coordinates: { latitude: 48.8584, longitude: 2.2945 },
            },
            cost: {
              amount: 50,
              currency: 'EUR',
              paidBy: 'test-user-415-301-8471',
            },
            notes: 'Remember to arrive 15 minutes early',
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
      currency: 'EUR',
      timezone: 'Europe/Paris',
      isPublic: false,
    },
  };

  await setDoc(doc(db, 'trips', trip1.tripId), trip1);
  console.log('✅ Created trip: Paris Adventure 2025');

  // Update user tripIds
  await setDoc(
    doc(db, 'users', 'test-user-415-301-8471'),
    { tripIds: ['trip-paris-2025'] },
    { merge: true }
  );
  await setDoc(
    doc(db, 'users', 'test-user-415-555-0001'),
    { tripIds: ['trip-paris-2025'] },
    { merge: true }
  );

  // Trip 2: Past trip
  const trip2 = {
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      isPublic: false,
    },
  };

  await setDoc(doc(db, 'trips', trip2.tripId), trip2);
  console.log('✅ Created trip: Tokyo Trip 2024');

  // Update user tripIds
  await setDoc(
    doc(db, 'users', 'test-user-415-301-8471'),
    { tripIds: ['trip-paris-2025', 'trip-tokyo-2024'] },
    { merge: true }
  );

  console.log('\n');
}

async function main() {
  console.log('🚀 Starting test data seeding...\n');
  console.log('═══════════════════════════════════════\n');

  try {
    await seedUsers();
    await seedTrips();

    console.log('═══════════════════════════════════════');
    console.log('✅ Test data seeding complete!\n');
    console.log('Created:');
    console.log(`  - ${testUsers.length} users`);
    console.log('  - 2 trips');
    console.log('  - 5 activities\n');
    console.log('Test User Credentials:');
    console.log('  Phone: +1 415 301 8471');
    console.log('  User ID: test-user-415-301-8471\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding test data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
