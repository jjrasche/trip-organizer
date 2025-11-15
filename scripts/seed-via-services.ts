/**
 * Seed test data using services (proper serverTimestamp handling)
 */
import { Timestamp } from 'firebase/firestore';
import { createUser } from '../src/services/user.service';
import { createTrip, addDay, addActivity } from '../src/services/trip.service';

async function main() {
  console.log('🚀 Seeding test data via services...\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Create test users
    console.log('🌱 Creating users...');

    const user1 = await createUser({
      phoneNumber: '+14153018471',
      displayName: 'Test User',
    });
    console.log('  ✅ Created: Test User');

    const user2 = await createUser({
      phoneNumber: '+14155550001',
      displayName: 'Alice Smith',
    });
    console.log('  ✅ Created: Alice Smith');

    const user3 = await createUser({
      phoneNumber: '+14155550002',
      displayName: 'Bob Johnson',
    });
    console.log('  ✅ Created: Bob Johnson\n');

    // Create Trip 1: Paris Adventure
    console.log('🗺️  Creating trips...');

    const parisTrip = await createTrip(
      user1.userId,
      user1.phoneNumber,
      user1.displayName,
      {
        title: 'Paris Adventure 2025',
        description: 'A week exploring the City of Light with friends',
        startDate: Timestamp.fromDate(new Date('2025-12-15')),
        endDate: Timestamp.fromDate(new Date('2025-12-22')),
        coverImageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Paris',
          isPublic: false,
        },
      }
    );
    console.log('  ✅ Created: Paris Adventure 2025');

    // Add Alice as participant
    // Note: addParticipant expects the service layer to handle this
    // For now, we'll skip this since it requires the full addParticipant implementation

    // Add Day 1
    await addDay(parisTrip.tripId, {
      date: Timestamp.fromDate(new Date('2025-12-15')),
      title: 'Arrival Day',
    });

    // Add Day 2
    await addDay(parisTrip.tripId, {
      date: Timestamp.fromDate(new Date('2025-12-16')),
      title: 'Exploring Central Paris',
    });

    // Get the trip to find day IDs
    const { getTrip } = await import('../src/services/trip.service.js');
    const tripWithDays = await getTrip(parisTrip.tripId);

    if (tripWithDays && tripWithDays.days.length >= 1) {
      const day1 = tripWithDays.days[0];

      // Add activities to Day 1
      await addActivity(parisTrip.tripId, day1.dayId, user1.userId, {
        title: 'Arrive at CDG Airport',
        description: 'Flight lands at 9:30 AM',
        type: 'travel',
        startTime: '09:30',
        endTime: '10:00',
        location: {
          name: 'Charles de Gaulle Airport',
          address: '95700 Roissy-en-France, France',
        },
      });

      await addActivity(parisTrip.tripId, day1.dayId, user1.userId, {
        title: 'Hotel Check-in',
        description: 'Check in at Hotel Le Marais',
        type: 'accommodation',
        startTime: '14:00',
        endTime: '15:00',
        location: {
          name: 'Hotel Le Marais',
          address: '12 Rue de Rivoli, 75004 Paris, France',
        },
      });

      await addActivity(parisTrip.tripId, day1.dayId, user1.userId, {
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
          paidBy: user1.userId,
          splitBetween: [user1.userId],
        },
      });

      console.log('  ✅ Added 3 activities to Day 1');
    }

    if (tripWithDays && tripWithDays.days.length >= 2) {
      const day2 = tripWithDays.days[1];

      await addActivity(parisTrip.tripId, day2.dayId, user1.userId, {
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
          paidBy: user1.userId,
        },
        notes: 'Remember to arrive 15 minutes early',
      });

      console.log('  ✅ Added 1 activity to Day 2');
    }

    // Create Trip 2: Past trip (Tokyo)
    const tokyoTrip = await createTrip(
      user1.userId,
      user1.phoneNumber,
      user1.displayName,
      {
        title: 'Tokyo Trip 2024',
        description: 'Amazing week in Japan',
        startDate: Timestamp.fromDate(new Date('2024-10-01')),
        endDate: Timestamp.fromDate(new Date('2024-10-08')),
        settings: {
          currency: 'JPY',
          timezone: 'Asia/Tokyo',
          isPublic: false,
        },
      }
    );
    console.log('  ✅ Created: Tokyo Trip 2024\n');

    console.log('═══════════════════════════════════════');
    console.log('✅ Seeding complete!\n');
    console.log('Created:');
    console.log('  - 3 users');
    console.log('  - 2 trips');
    console.log('  - 2 days');
    console.log('  - 4 activities\n');
    console.log('Test credentials:');
    console.log('  Phone: +1 415 301 8471');
    console.log('  User ID: test-user-415-301-8471\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Seeding error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
