/**
 * Database Verification Script
 * Verifies test data in Firestore and displays current state
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Firebase config
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

const TEST_USER_ID = 'test-user-415-301-8471';

async function verifyUser() {
  console.log('\n👤 Verifying Test User...');
  console.log('═══════════════════════════════════════\n');

  try {
    const userDoc = await getDoc(doc(db, 'users', TEST_USER_ID));

    if (!userDoc.exists()) {
      console.log('❌ User NOT FOUND in database');
      console.log('   Run: npm run seed\n');
      return null;
    }

    const user = userDoc.data();
    console.log('✅ User found:');
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Trip IDs: ${user.tripIds?.length || 0} trip(s)`);

    if (user.tripIds && user.tripIds.length > 0) {
      console.log(`   Trips: ${user.tripIds.join(', ')}`);
    }

    console.log('');
    return user;
  } catch (error: any) {
    console.log('❌ Error fetching user:', error.message);
    return null;
  }
}

async function verifyTrips() {
  console.log('\n🗺️  Verifying Trips...');
  console.log('═══════════════════════════════════════\n');

  try {
    const tripsQuery = query(
      collection(db, 'trips'),
      where('createdBy', '==', TEST_USER_ID)
    );

    const snapshot = await getDocs(tripsQuery);

    if (snapshot.empty) {
      console.log('❌ No trips found for user');
      console.log('   Run: npm run seed\n');
      return [];
    }

    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Found ${trips.length} trip(s):\n`);

    trips.forEach((trip: any, index) => {
      console.log(`${index + 1}. ${trip.title}`);
      console.log(`   Trip ID: ${trip.tripId}`);
      console.log(`   Dates: ${trip.startDate?.toDate().toDateString()} - ${trip.endDate?.toDate().toDateString()}`);
      console.log(`   Days: ${trip.days?.length || 0}`);
      console.log(`   Participants: ${trip.participants?.length || 0}`);
      console.log(`   Created by: ${trip.createdBy}`);

      // Count activities
      let activityCount = 0;
      trip.days?.forEach((day: any) => {
        activityCount += day.activities?.length || 0;
      });
      console.log(`   Activities: ${activityCount}`);

      if (trip.days && trip.days.length > 0) {
        console.log(`   Days breakdown:`);
        trip.days.forEach((day: any) => {
          console.log(`     - ${day.title}: ${day.activities?.length || 0} activities`);
        });
      }

      console.log('');
    });

    return trips;
  } catch (error: any) {
    console.log('❌ Error fetching trips:', error.message);
    return [];
  }
}

async function verifyTripDetails(tripId: string) {
  console.log(`\n📋 Detailed Trip View: ${tripId}`);
  console.log('═══════════════════════════════════════\n');

  try {
    const tripDoc = await getDoc(doc(db, 'trips', tripId));

    if (!tripDoc.exists()) {
      console.log('❌ Trip not found');
      return null;
    }

    const trip: any = tripDoc.data();

    console.log(`Title: ${trip.title}`);
    console.log(`Description: ${trip.description || 'N/A'}`);
    console.log(`\nParticipants (${trip.participants?.length || 0}):`);

    trip.participants?.forEach((p: any) => {
      console.log(`  - ${p.displayName} (${p.phoneNumber}) - ${p.role}`);
    });

    if (trip.days && trip.days.length > 0) {
      console.log(`\nDays (${trip.days.length}):`);

      trip.days.forEach((day: any, dayIndex: number) => {
        console.log(`\n  Day ${dayIndex + 1}: ${day.title} (${day.date?.toDate().toDateString()})`);

        if (day.activities && day.activities.length > 0) {
          day.activities.forEach((activity: any, actIndex: number) => {
            console.log(`    ${actIndex + 1}. ${activity.title}`);
            if (activity.startTime) {
              console.log(`       Time: ${activity.startTime}${activity.endTime ? ` - ${activity.endTime}` : ''}`);
            }
            if (activity.location) {
              console.log(`       Location: ${activity.location.name}`);
              if (activity.location.address) {
                console.log(`       Address: ${activity.location.address}`);
              }
            }
            if (activity.description) {
              console.log(`       Description: ${activity.description}`);
            }
            if (activity.notes) {
              console.log(`       Notes: ${activity.notes}`);
            }
          });
        } else {
          console.log(`    (No activities)`);
        }
      });
    } else {
      console.log('\n  (No days scheduled)');
    }

    console.log('');
    return trip;
  } catch (error: any) {
    console.log('❌ Error fetching trip details:', error.message);
    return null;
  }
}

async function checkDatabaseConnectivity() {
  console.log('🔌 Testing Firestore connectivity...');

  try {
    // Simple read to test connection
    const testDoc = await getDoc(doc(db, 'users', TEST_USER_ID));
    console.log('✅ Successfully connected to Firestore\n');
    return true;
  } catch (error: any) {
    console.log('❌ Failed to connect to Firestore');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Database Verification Tool           ║');
  console.log('╚════════════════════════════════════════╝');

  // Test connectivity
  const connected = await checkDatabaseConnectivity();
  if (!connected) {
    console.log('Cannot proceed without database connection.');
    process.exit(1);
  }

  // Verify user
  const user = await verifyUser();

  // Verify trips
  const trips = await verifyTrips();

  // Show details for first trip
  if (trips.length > 0) {
    await verifyTripDetails(trips[0].tripId);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Summary                              ║');
  console.log('╚════════════════════════════════════════╝\n');

  if (user && trips.length > 0) {
    console.log('✅ Database verification PASSED');
    console.log(`   - User: ${user.displayName}`);
    console.log(`   - Trips: ${trips.length}`);

    let totalDays = 0;
    let totalActivities = 0;
    trips.forEach((trip: any) => {
      totalDays += trip.days?.length || 0;
      trip.days?.forEach((day: any) => {
        totalActivities += day.activities?.length || 0;
      });
    });

    console.log(`   - Days: ${totalDays}`);
    console.log(`   - Activities: ${totalActivities}`);
    console.log('\n✅ Ready for E2E testing: npm run test:e2e\n');
    process.exit(0);
  } else {
    console.log('❌ Database verification FAILED');
    console.log('   Missing test data. Run: npm run seed\n');
    process.exit(1);
  }
}

main();
