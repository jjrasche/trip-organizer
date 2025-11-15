import { useState, useEffect } from 'react';
import { getUser } from '../services/user.service';
import { getUserTrips, createTrip } from '../services/trip.service';
import { signOut } from '../services/auth.service';
import CreateTripModal from '../components/CreateTripModal';
import { Timestamp } from 'firebase/firestore';
import type { User, Trip } from '../types';

interface DashboardProps {
  userId: string;
  onViewTrip: (tripId: string) => void;
}

export default function Dashboard({ userId, onViewTrip }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [userData, tripsData] = await Promise.all([
        getUser(userId),
        getUserTrips(userId),
      ]);

      setUser(userData);
      setTrips(tripsData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateTrip = async (tripData: {
    title: string;
    description: string;
    startDate: Timestamp;
    endDate: Timestamp;
  }) => {
    if (!user) return;

    try {
      const newTrip = await createTrip(
        userId,
        user.phoneNumber,
        user.displayName,
        tripData
      );

      console.log('Created trip:', newTrip.tripId);

      // Reload trips to show the new one
      await loadData();

      // Navigate to the new trip
      onViewTrip(newTrip.tripId);
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error; // Re-throw so modal can show error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-300 font-semibold">
                {user?.displayName?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{user?.displayName || 'User'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.phoneNumber}</p>
            </div>
          </div>

          <button onClick={handleSignOut} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Coming Up Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Trips</h2>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Create Trip</button>
          </div>

          {trips.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">Create Your First Trip</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.map((trip) => (
                <button
                  key={trip.tripId}
                  onClick={() => onViewTrip(trip.tripId)}
                  className="card text-left hover:shadow-md transition-shadow"
                  data-testid="trip-card"
                  data-trip-id={trip.tripId}
                >
                  {trip.coverImageUrl && (
                    <img
                      src={trip.coverImageUrl}
                      alt={trip.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}

                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2" data-testid="trip-title">
                    {trip.title}
                  </h3>

                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>📅</span>
                    <span className="ml-2">
                      {trip.startDate.toDate().toLocaleDateString()} -{' '}
                      {trip.endDate.toDate().toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>👥</span>
                    <span className="ml-2">{trip.participants.length} participants</span>
                  </div>

                  {trip.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{trip.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTrip}
      />
    </div>
  );
}
