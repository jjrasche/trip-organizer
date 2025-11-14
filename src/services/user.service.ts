import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, CreateUserInput, UpdateUserInput } from '../types';

/**
 * User Service
 * Handles user profile operations in Firestore
 */

const USERS_COLLECTION = 'users';

/**
 * Create a new user profile
 * @param userId - Firebase Auth UID
 * @param userData - User data (phone number, display name)
 * @returns Created user
 */
export async function createUser(
  userId: string,
  userData: CreateUserInput
): Promise<User> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    const newUser: User = {
      userId,
      phoneNumber: userData.phoneNumber,
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl,
      email: userData.email,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      tripIds: [],
    };

    await setDoc(userRef, newUser);

    // Re-fetch to get server timestamps
    const userDoc = await getDoc(userRef);
    return userDoc.data() as User;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User or null if not found
 */
export async function getUser(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as User;
  } catch (error: any) {
    console.error('Error getting user:', error);
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

/**
 * Update user profile
 * @param userId - User ID
 * @param updates - Partial user data to update
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserInput
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

/**
 * Add trip ID to user's tripIds array
 * @param userId - User ID
 * @param tripId - Trip ID to add
 */
export async function addTripToUser(
  userId: string,
  tripId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      tripIds: arrayUnion(tripId),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error adding trip to user:', error);
    throw new Error(`Failed to add trip to user: ${error.message}`);
  }
}

/**
 * Remove trip ID from user's tripIds array
 * @param userId - User ID
 * @param tripId - Trip ID to remove
 */
export async function removeTripFromUser(
  userId: string,
  tripId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      tripIds: arrayRemove(tripId),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error removing trip from user:', error);
    throw new Error(`Failed to remove trip from user: ${error.message}`);
  }
}

/**
 * Update user's display name and propagate to all trips
 * This demonstrates denormalization - we must update the user
 * document AND all trip documents where this user is a participant
 *
 * @param userId - User ID
 * @param newDisplayName - New display name
 */
export async function updateUserDisplayName(
  userId: string,
  newDisplayName: string
): Promise<void> {
  try {
    // 1. Update user document
    await updateUser(userId, { displayName: newDisplayName });

    // 2. Update denormalized displayName in all trips
    // This would typically be done via Cloud Function to handle atomicity
    // For now, we'll handle it in the trip service when updating participants
    // See trip.service.ts > updateParticipantDisplayName()
  } catch (error: any) {
    console.error('Error updating user display name:', error);
    throw new Error(`Failed to update display name: ${error.message}`);
  }
}
