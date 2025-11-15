import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { addTripToUser, removeTripFromUser } from './user.service';
import type {
  Trip,
  CreateTripInput,
  UpdateTripInput,
  Participant,
  AddParticipantInput,
  Day,
  CreateDayInput,
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
} from '../types';
import { nanoid } from 'nanoid';

/**
 * Trip Service
 * Handles trip CRUD operations and real-time subscriptions
 */

const TRIPS_COLLECTION = 'trips';

/**
 * Generate a random share token for public trip access
 */
function generateShareToken(): string {
  return nanoid(16);
}

/**
 * Create a new trip
 * @param userId - Creator's user ID (becomes owner)
 * @param userPhone - Creator's phone number
 * @param userDisplayName - Creator's display name
 * @param tripData - Trip creation data
 * @returns Created trip
 */
export async function createTrip(
  userId: string,
  userPhone: string,
  userDisplayName: string,
  tripData: CreateTripInput
): Promise<Trip> {
  try {
    const tripRef = doc(collection(db, TRIPS_COLLECTION));
    const tripId = tripRef.id;

    // Note: serverTimestamp() cannot be used inside arrays
    // Use Timestamp.now() instead
    const creatorParticipant: Participant = {
      userId,
      phoneNumber: userPhone,
      displayName: userDisplayName,
      role: 'owner',
      joinedAt: Timestamp.now(),
    };

    // Build trip object, excluding undefined fields (Firestore doesn't allow undefined)
    const newTrip: any = {
      tripId,
      title: tripData.title,
      description: tripData.description || '',
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      participants: [creatorParticipant],
      days: [],
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        currency: tripData.settings?.currency || 'USD',
        timezone: tripData.settings?.timezone || 'UTC',
        isPublic: tripData.settings?.isPublic || false,
      },
    };

    // Add optional fields only if they have values
    if (tripData.coverImageUrl) {
      newTrip.coverImageUrl = tripData.coverImageUrl;
    }
    if (tripData.settings?.isPublic) {
      newTrip.settings.shareToken = generateShareToken();
    }

    await setDoc(tripRef, newTrip);

    // Add trip to user's tripIds
    await addTripToUser(userId, tripId);

    // Re-fetch to get server timestamps
    const tripDoc = await getDoc(tripRef);
    return tripDoc.data() as Trip;
  } catch (error: any) {
    console.error('Error creating trip:', error);
    throw new Error(`Failed to create trip: ${error.message}`);
  }
}

/**
 * Get trip by ID
 * @param tripId - Trip ID
 * @returns Trip or null if not found
 */
export async function getTrip(tripId: string): Promise<Trip | null> {
  try {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
      return null;
    }

    return tripDoc.data() as Trip;
  } catch (error: any) {
    console.error('Error getting trip:', error);
    throw new Error(`Failed to get trip: ${error.message}`);
  }
}

/**
 * Get all trips for a user
 * @param userId - User ID
 * @returns Array of trips where user is a participant
 */
export async function getUserTrips(userId: string): Promise<Trip[]> {
  try {
    const tripsRef = collection(db, TRIPS_COLLECTION);
    // Query by createdBy first (simpler query)
    const createdQuery = query(
      tripsRef,
      where('createdBy', '==', userId)
    );

    const createdSnapshot = await getDocs(createdQuery);
    const trips = createdSnapshot.docs.map((doc) => doc.data() as Trip);

    // TODO: Also query for trips where user is a participant but not creator
    // This requires a different approach since array-contains with partial objects doesn't work
    // For now, returning trips created by user

    // Sort by startDate client-side
    return trips.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
  } catch (error: any) {
    console.error('Error getting user trips:', error);
    throw new Error(`Failed to get user trips: ${error.message}`);
  }
}

/**
 * Get upcoming trips for a user
 * @param userId - User ID
 * @returns Array of upcoming trips
 */
export async function getUpcomingTrips(userId: string): Promise<Trip[]> {
  try {
    const now = Timestamp.now();
    const tripsRef = collection(db, TRIPS_COLLECTION);
    const q = query(
      tripsRef,
      where('participants', 'array-contains', { userId }),
      where('startDate', '>', now),
      orderBy('startDate', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Trip);
  } catch (error: any) {
    console.error('Error getting upcoming trips:', error);
    throw new Error(`Failed to get upcoming trips: ${error.message}`);
  }
}

/**
 * Update trip details
 * @param tripId - Trip ID
 * @param updates - Partial trip data to update
 */
export async function updateTrip(
  tripId: string,
  updates: UpdateTripInput
): Promise<void> {
  try {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId);

    await updateDoc(tripRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating trip:', error);
    throw new Error(`Failed to update trip: ${error.message}`);
  }
}

/**
 * Delete trip (Owner only)
 * Also removes trip from all participants' tripIds
 * @param tripId - Trip ID
 */
export async function deleteTrip(tripId: string): Promise<void> {
  try {
    // Get trip to access participants
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const batch = writeBatch(db);

    // Delete trip document
    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    batch.delete(tripRef);

    await batch.commit();

    // Remove trip from all participants (do this after batch to avoid failure)
    for (const participant of trip.participants) {
      await removeTripFromUser(participant.userId, tripId);
    }
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    throw new Error(`Failed to delete trip: ${error.message}`);
  }
}

/**
 * Add participant to trip
 * @param tripId - Trip ID
 * @param participantData - Participant data
 */
export async function addParticipant(
  tripId: string,
  participantData: AddParticipantInput
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // Note: serverTimestamp() cannot be used inside arrays
    const newParticipant: Participant = {
      ...participantData,
      joinedAt: Timestamp.now(),
    };

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      participants: [...trip.participants, newParticipant],
      updatedAt: serverTimestamp(),
    });

    // Add trip to participant's tripIds
    await addTripToUser(participantData.userId, tripId);
  } catch (error: any) {
    console.error('Error adding participant:', error);
    throw new Error(`Failed to add participant: ${error.message}`);
  }
}

/**
 * Remove participant from trip
 * @param tripId - Trip ID
 * @param userId - User ID to remove
 */
export async function removeParticipant(
  tripId: string,
  userId: string
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedParticipants = trip.participants.filter(
      (p) => p.userId !== userId
    );

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      participants: updatedParticipants,
      updatedAt: serverTimestamp(),
    });

    // Remove trip from participant's tripIds
    await removeTripFromUser(userId, tripId);
  } catch (error: any) {
    console.error('Error removing participant:', error);
    throw new Error(`Failed to remove participant: ${error.message}`);
  }
}

/**
 * Update participant role
 * @param tripId - Trip ID
 * @param userId - User ID
 * @param newRole - New role
 */
export async function updateParticipantRole(
  tripId: string,
  userId: string,
  newRole: 'owner' | 'editor' | 'viewer'
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedParticipants = trip.participants.map((p) =>
      p.userId === userId ? { ...p, role: newRole } : p
    );

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      participants: updatedParticipants,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating participant role:', error);
    throw new Error(`Failed to update participant role: ${error.message}`);
  }
}

/**
 * Update denormalized participant data (for handling user profile updates)
 * @param userId - User ID
 * @param updates - Fields to update (phoneNumber, displayName)
 */
export async function updateParticipantData(
  userId: string,
  updates: { phoneNumber?: string; displayName?: string }
): Promise<void> {
  try {
    // Find all trips where user is a participant
    const tripsRef = collection(db, TRIPS_COLLECTION);
    const q = query(tripsRef, where('participants', 'array-contains', { userId }));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);

    querySnapshot.forEach((docSnapshot) => {
      const trip = docSnapshot.data() as Trip;
      const updatedParticipants = trip.participants.map((p) =>
        p.userId === userId ? { ...p, ...updates } : p
      );

      batch.update(docSnapshot.ref, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error: any) {
    console.error('Error updating participant data:', error);
    throw new Error(`Failed to update participant data: ${error.message}`);
  }
}

/**
 * Add day to trip
 * @param tripId - Trip ID
 * @param dayData - Day data
 */
export async function addDay(
  tripId: string,
  dayData: CreateDayInput
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const newDay: Day = {
      dayId: nanoid(),
      date: dayData.date,
      title: dayData.title,
      activities: [],
    };

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      days: [...trip.days, newDay],
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error adding day:', error);
    throw new Error(`Failed to add day: ${error.message}`);
  }
}

/**
 * Remove day from trip
 * @param tripId - Trip ID
 * @param dayId - Day ID
 */
export async function removeDay(tripId: string, dayId: string): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedDays = trip.days.filter((d) => d.dayId !== dayId);

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      days: updatedDays,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error removing day:', error);
    throw new Error(`Failed to remove day: ${error.message}`);
  }
}

/**
 * Add activity to a day
 * @param tripId - Trip ID
 * @param dayId - Day ID
 * @param userId - User ID (creator)
 * @param activityData - Activity data
 */
export async function addActivity(
  tripId: string,
  dayId: string,
  userId: string,
  activityData: CreateActivityInput
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // Note: serverTimestamp() cannot be used inside arrays
    // Build activity object, excluding undefined fields (Firestore doesn't allow undefined)
    const newActivity: any = {
      activityId: nanoid(),
      title: activityData.title,
      type: activityData.type,
      attachments: [],
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedBy: userId,
      updatedAt: Timestamp.now(),
    };

    // Add optional fields only if they have values
    if (activityData.description) {
      newActivity.description = activityData.description;
    }
    if (activityData.startTime) {
      newActivity.startTime = activityData.startTime;
    }
    if (activityData.endTime) {
      newActivity.endTime = activityData.endTime;
    }
    if (activityData.location) {
      newActivity.location = activityData.location;
    }
    if (activityData.cost) {
      newActivity.cost = activityData.cost;
    }
    if (activityData.notes) {
      newActivity.notes = activityData.notes;
    }

    const updatedDays = trip.days.map((day) =>
      day.dayId === dayId
        ? { ...day, activities: [...day.activities, newActivity] }
        : day
    );

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      days: updatedDays,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error adding activity:', error);
    throw new Error(`Failed to add activity: ${error.message}`);
  }
}

/**
 * Update activity
 * @param tripId - Trip ID
 * @param dayId - Day ID
 * @param activityId - Activity ID
 * @param userId - User ID (updater)
 * @param updates - Activity updates
 */
export async function updateActivity(
  tripId: string,
  dayId: string,
  activityId: string,
  userId: string,
  updates: UpdateActivityInput
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedDays = trip.days.map((day) =>
      day.dayId === dayId
        ? {
            ...day,
            activities: day.activities.map((activity) =>
              activity.activityId === activityId
                ? {
                    ...activity,
                    ...updates,
                    updatedBy: userId,
                    updatedAt: Timestamp.now(),
                  }
                : activity
            ),
          }
        : day
    );

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      days: updatedDays,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    throw new Error(`Failed to update activity: ${error.message}`);
  }
}

/**
 * Remove activity from day
 * @param tripId - Trip ID
 * @param dayId - Day ID
 * @param activityId - Activity ID
 */
export async function removeActivity(
  tripId: string,
  dayId: string,
  activityId: string
): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedDays = trip.days.map((day) =>
      day.dayId === dayId
        ? {
            ...day,
            activities: day.activities.filter((a) => a.activityId !== activityId),
          }
        : day
    );

    const tripRef = doc(db, TRIPS_COLLECTION, tripId);
    await updateDoc(tripRef, {
      days: updatedDays,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error removing activity:', error);
    throw new Error(`Failed to remove activity: ${error.message}`);
  }
}

/**
 * Subscribe to real-time trip updates
 * @param tripId - Trip ID
 * @param callback - Function called when trip changes
 * @returns Unsubscribe function
 */
export function subscribeToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): Unsubscribe {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  return onSnapshot(
    tripRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Trip);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in trip subscription:', error);
      callback(null);
    }
  );
}
