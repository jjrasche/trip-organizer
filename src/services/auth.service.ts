import {
  signInWithPhoneNumber,
  ConfirmationResult,
  ApplicationVerifier,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Authentication Service
 * Handles phone number authentication with Firebase Auth
 */

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * @param containerId - ID of the HTML element to render reCAPTCHA
 * @returns RecaptchaVerifier instance
 */
export function initRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow phone auth
    },
    'expired-callback': () => {
      // Response expired, ask user to solve reCAPTCHA again
      console.warn('reCAPTCHA expired');
    },
  });
}

/**
 * Send SMS verification code to phone number
 * @param phoneNumber - Phone number in E.164 format (+1234567890)
 * @param appVerifier - reCAPTCHA verifier
 * @returns ConfirmationResult to verify the code
 */
export async function sendVerificationCode(
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  try {
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      appVerifier
    );
    return confirmationResult;
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    throw new Error(`Failed to send verification code: ${error.message}`);
  }
}

/**
 * Verify SMS code and sign in user
 * @param confirmationResult - Result from sendVerificationCode
 * @param verificationCode - 6-digit code from SMS
 * @returns Firebase user credentials
 */
export async function verifyCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
) {
  try {
    const userCredential = await confirmationResult.confirm(verificationCode);
    return userCredential;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    throw new Error(`Invalid verification code: ${error.message}`);
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

/**
 * Get current authenticated user
 * @returns Current Firebase user or null
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Subscribe to authentication state changes
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user's ID token
 * @returns ID token string for API authentication
 */
export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error: any) {
    console.error('Error getting ID token:', error);
    return null;
  }
}
