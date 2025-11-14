import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Presence } from '../types';

/**
 * Presence Service
 * Handles real-time presence tracking for collaborative editing
 */

/**
 * Set user as currently viewing a trip
 * @param tripId - Trip ID
 * @param userId - User ID
 * @param phoneNumber - User's phone number
 * @param displayName - User's display name
 */
export async function setPresence(
  tripId: string,
  userId: string,
  phoneNumber: string,
  displayName: string
): Promise<void> {
  try {
    const presenceRef = doc(db, 'trips', tripId, 'presence', userId);

    const presenceData: Presence = {
      userId,
      phoneNumber,
      displayName,
      lastSeen: serverTimestamp() as any,
      currentlyViewing: true,
    };

    await setDoc(presenceRef, presenceData);
  } catch (error: any) {
    console.error('Error setting presence:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Update user's last seen timestamp
 * @param tripId - Trip ID
 * @param userId - User ID
 */
export async function updatePresence(
  tripId: string,
  userId: string
): Promise<void> {
  try {
    const presenceRef = doc(db, 'trips', tripId, 'presence', userId);

    await setDoc(
      presenceRef,
      {
        lastSeen: serverTimestamp(),
        currentlyViewing: true,
      },
      { merge: true }
    );
  } catch (error: any) {
    console.error('Error updating presence:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Remove user's presence (they left the trip view)
 * @param tripId - Trip ID
 * @param userId - User ID
 */
export async function removePresence(
  tripId: string,
  userId: string
): Promise<void> {
  try {
    const presenceRef = doc(db, 'trips', tripId, 'presence', userId);
    await deleteDoc(presenceRef);
  } catch (error: any) {
    console.error('Error removing presence:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Subscribe to presence updates for a trip
 * @param tripId - Trip ID
 * @param callback - Function called when presence changes
 * @returns Unsubscribe function
 */
export function subscribeToPresence(
  tripId: string,
  callback: (presences: Presence[]) => void
): Unsubscribe {
  const presenceRef = collection(db, 'trips', tripId, 'presence');
  const q = query(presenceRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const presences: Presence[] = [];
      snapshot.forEach((doc) => {
        presences.push(doc.data() as Presence);
      });
      callback(presences);
    },
    (error) => {
      console.error('Error in presence subscription:', error);
      callback([]);
    }
  );
}

/**
 * Start presence heartbeat (update every 30 seconds)
 * @param tripId - Trip ID
 * @param userId - User ID
 * @returns Stop function to clear interval
 */
export function startPresenceHeartbeat(
  tripId: string,
  userId: string
): () => void {
  const intervalId = setInterval(() => {
    updatePresence(tripId, userId);
  }, 30000); // 30 seconds

  return () => {
    clearInterval(intervalId);
    removePresence(tripId, userId);
  };
}
