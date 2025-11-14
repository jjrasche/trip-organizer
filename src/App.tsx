import { useState, useEffect } from 'react';
import { onAuthStateChange } from './services/auth.service';
import { User as FirebaseUser } from 'firebase/auth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TripDetail from './pages/TripDetail';

type ViewState =
  | { type: 'auth' }
  | { type: 'dashboard' }
  | { type: 'trip'; tripId: string };

// DEVELOPMENT MODE: Bypass auth with test user
const DEV_MODE = import.meta.env.DEV;
const TEST_USER_ID = 'test-user-415-301-8471';

function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ type: 'auth' });

  useEffect(() => {
    // DEV MODE: Auto-login with test user
    if (DEV_MODE) {
      // Create a mock Firebase user object
      const mockUser = {
        uid: TEST_USER_ID,
        phoneNumber: '+14153018471',
        displayName: 'Test User',
      } as FirebaseUser;

      setCurrentUser(mockUser);
      setView({ type: 'dashboard' });
      setLoading(false);
      return;
    }

    // PRODUCTION: Normal auth flow
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        setView({ type: 'dashboard' });
      } else {
        setView({ type: 'auth' });
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  if (view.type === 'dashboard') {
    return (
      <Dashboard
        userId={currentUser.uid}
        onViewTrip={(tripId) => setView({ type: 'trip', tripId })}
      />
    );
  }

  if (view.type === 'trip') {
    return (
      <TripDetail
        tripId={view.tripId}
        userId={currentUser.uid}
        onBack={() => setView({ type: 'dashboard' })}
      />
    );
  }

  return null;
}

export default App;
