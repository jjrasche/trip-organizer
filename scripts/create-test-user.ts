import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAFNJYdKTmaCbRyYCLsg1XranHlBKIbK_s",
  authDomain: "trip-organizer-c0ed2.firebaseapp.com",
  projectId: "trip-organizer-c0ed2",
  storageBucket: "trip-organizer-c0ed2.firebasestorage.app",
  messagingSenderId: "453462917872",
  appId: "1:453462917872:web:9b79536a1e82742d333835",
  measurementId: "G-VH8YXGN265"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestUser() {
  const userId = 'test-user-415-301-8471'; // Test user ID
  const phoneNumber = '+14153018471'; // E.164 format

  const userData = {
    userId: userId,
    phoneNumber: phoneNumber,
    displayName: 'Test User',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tripIds: [],
  };

  try {
    console.log('Creating test user...');
    console.log('User ID:', userId);
    console.log('Phone:', phoneNumber);

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, userData);

    console.log('\n✅ Test user created successfully!');
    console.log('\nUser details:');
    console.log('  ID:', userId);
    console.log('  Phone:', phoneNumber);
    console.log('  Name: Test User');
    console.log('\nYou can now use this user in the app!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

createTestUser();
