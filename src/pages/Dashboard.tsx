import { useState, useEffect } from 'react';
import { getUser } from '../services/user.service';
import { getUserTrips, createTrip, updateTrip, deleteTrip } from '../services/trip.service';
import { signOut } from '../services/auth.service';
import CreateTripModal from '../components/CreateTripModal';
import EditTripModal from '../components/EditTripModal';
import ConfirmDialog from '../components/ConfirmDialog';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEditTrip = async (tripData: {
    title: string;
    description: string;
    startDate: Timestamp;
    endDate: Timestamp;
  }) => {
    if (!editingTrip) return;

    try {
      await updateTrip(editingTrip.tripId, tripData);

      console.log('Updated trip:', editingTrip.tripId);

      // Reload trips to show the updated data
      await loadData();

      setShowEditModal(false);
      setEditingTrip(null);
    } catch (error) {
      console.error('Error updating trip:', error);
      throw error; // Re-throw so modal can show error
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (trip: Trip) => {
    setDeletingTrip(trip);
    setShowDeleteConfirm(true);
  };

  const handleDeleteTrip = async () => {
    if (!deletingTrip) return;

    setIsDeleting(true);
    try {
      await deleteTrip(deletingTrip.tripId);
      console.log('Deleted trip:', deletingTrip.tripId);

      // Reload trips
      await loadData();

      setShowDeleteConfirm(false);
      setDeletingTrip(null);
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    } finally {
      setIsDeleting(false);
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
                <div
                  key={trip.tripId}
                  className="card hover:shadow-md transition-shadow"
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

                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>👥</span>
                    <span className="ml-2">{trip.participants.length} participants</span>
                  </div>

                  {trip.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{trip.description}</p>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => onViewTrip(trip.tripId)}
                      className="flex-1 btn-primary text-sm py-2"
                    >
                      View Trip
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(trip);
                      }}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(trip);
                      }}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm py-2 px-3 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete trip"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
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

      {editingTrip && (
        <EditTripModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTrip(null);
          }}
          onSubmit={handleEditTrip}
          trip={editingTrip}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingTrip(null);
        }}
        onConfirm={handleDeleteTrip}
        title="Delete Trip"
        message={
          <div>
            <p className="mb-2">Are you sure you want to delete <strong>{deletingTrip?.title}</strong>?</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete the trip and all its activities. This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete Trip"
        variant="danger"
        isProcessing={isDeleting}
      />
    </div>
  );
}
