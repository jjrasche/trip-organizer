import { useState, useEffect, useRef } from 'react';
import { getTrip, subscribeToTrip, addActivity, updateActivity, removeActivity } from '../services/trip.service';
import { getUser } from '../services/user.service';
import { sendMessage, generateSuggestions, isAIConfigured } from '../services/ai.service';
import type { Trip, User, CreateActivityInput, UpdateActivityInput, Activity } from '../types';
import AIChat from '../components/AIChat';
import AddActivityModal from '../components/AddActivityModal';
import EditActivityModal from '../components/EditActivityModal';
import ConfirmDialog from '../components/ConfirmDialog';

interface TripDetailProps {
  tripId: string;
  userId: string;
  onBack: () => void;
}

export default function TripDetail({ tripId, userId, onBack }: TripDetailProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedDayTitle, setSelectedDayTitle] = useState<string>('');
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingActivityDayId, setEditingActivityDayId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<{activity: Activity, dayId: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();

    // Subscribe to real-time trip updates
    const unsubscribe = subscribeToTrip(tripId, (updatedTrip) => {
      setTrip(updatedTrip);
    });

    return () => unsubscribe();
  }, [tripId, userId]);

  const loadData = async () => {
    try {
      const [tripData, userData] = await Promise.all([
        getTrip(tripId),
        getUser(userId),
      ]);

      setTrip(tripData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (activityData: CreateActivityInput) => {
    if (!selectedDayId) return;
    try {
      await addActivity(tripId, selectedDayId, userId, activityData);
      // Trip updates automatically via real-time subscription
      setShowAddActivityModal(false);
      setSelectedDayId(null);
      setSelectedDayTitle('');
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  };

  const openAddActivityModal = (dayId: string, dayTitle: string) => {
    setSelectedDayId(dayId);
    setSelectedDayTitle(dayTitle);
    setShowAddActivityModal(true);
  };

  const handleEditActivity = async (activityData: UpdateActivityInput) => {
    if (!editingActivity || !editingActivityDayId) return;
    try {
      await updateActivity(tripId, editingActivityDayId, editingActivity.activityId, userId, activityData);
      // Trip updates automatically via real-time subscription
      setShowEditActivityModal(false);
      setEditingActivity(null);
      setEditingActivityDayId(null);
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  };

  const openEditActivityModal = (activity: Activity, dayId: string, dayTitle: string) => {
    setEditingActivity(activity);
    setEditingActivityDayId(dayId);
    setSelectedDayTitle(dayTitle);
    setShowEditActivityModal(true);
  };

  const openDeleteConfirm = (activity: Activity, dayId: string) => {
    setDeletingActivity({ activity, dayId });
    setShowDeleteConfirm(true);
  };

  const handleDeleteActivity = async () => {
    if (!deletingActivity) return;

    setIsDeleting(true);
    try {
      await removeActivity(tripId, deletingActivity.dayId, deletingActivity.activity.activityId);
      console.log('Deleted activity:', deletingActivity.activity.activityId);

      // Trip updates automatically via real-time subscription
      setShowDeleteConfirm(false);
      setDeletingActivity(null);
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity. Please try again.');
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

  if (!trip || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Trip not found</p>
          <button onClick={onBack} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const userRole = trip.participants.find((p) => p.userId === userId)?.role || 'viewer';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                data-testid="back-button"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trip.startDate.toDate().toLocaleDateString()} -{' '}
                  {trip.endDate.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Participants viewing */}
              <div className="flex -space-x-2">
                {trip.participants.slice(0, 3).map((p) => (
                  <div
                    key={p.userId}
                    className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 border-2 border-white dark:border-gray-800 flex items-center justify-center"
                    title={p.displayName}
                  >
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      {p.displayName.charAt(0)}
                    </span>
                  </div>
                ))}
                {trip.participants.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      +{trip.participants.length - 3}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Chat Toggle */}
              {isAIConfigured() && (
                <button
                  onClick={() => setShowAIChat(!showAIChat)}
                  className={`p-2 rounded-lg transition-colors ${
                    showAIChat
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="AI Assistant"
                >
                  🤖
                </button>
              )}

              {/* Profile */}
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.displayName.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* AI Chat */}
        {showAIChat && trip && user && (
          <div className="mb-6">
            <AIChat trip={trip} currentUser={user} />
          </div>
        )}

        {/* Trip Description */}
        {trip.description && (
          <div className="card mb-6">
            <p className="text-gray-700 dark:text-gray-300">{trip.description}</p>
          </div>
        )}

        {/* Participants */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Participants ({trip.participants.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trip.participants.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <span className="text-primary-700 dark:text-primary-300 font-medium">
                    {participant.displayName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{participant.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{participant.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Days and Activities */}
        <div className="space-y-6">
          {trip.days.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No days planned yet</p>
              {(userRole === 'owner' || userRole === 'editor') && (
                <button className="btn-primary">Add First Day</button>
              )}
            </div>
          ) : (
            trip.days.map((day, index) => (
              <div key={day.dayId} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {day.title || `Day ${index + 1}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {day.date.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  {(userRole === 'owner' || userRole === 'editor') && (
                    <button
                      onClick={() => openAddActivityModal(day.dayId, day.title || `Day ${index + 1}`)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      + Add Activity
                    </button>
                  )}
                </div>

                {day.activities.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No activities planned</p>
                ) : (
                  <div className="space-y-4">
                    {day.activities.map((activity) => (
                      <div
                        key={activity.activityId}
                        className="border-l-4 border-primary-200 dark:border-primary-700 pl-4 py-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">{getActivityIcon(activity.type)}</span>
                              <h4 className="font-medium text-gray-900 dark:text-white">{activity.title}</h4>
                            </div>

                            {activity.startTime && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                ⏰ {activity.startTime}{activity.endTime ? ` - ${activity.endTime}` : ''}
                              </p>
                            )}

                            {activity.location && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                📍 {activity.location.name}
                              </p>
                            )}

                            {activity.cost && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                💰 ${activity.cost.amount} {activity.cost.currency}
                              </p>
                            )}

                            {activity.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                {activity.description}
                              </p>
                            )}

                            {/* Actions Section */}
                            <div className="mt-3 text-sm flex items-center gap-4">
                              <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                                💬 Coordinate
                              </button>
                              {(userRole === 'owner' || userRole === 'editor') && (
                                <>
                                  <button
                                    onClick={() => openEditActivityModal(activity, day.dayId, day.title || `Day ${index + 1}`)}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => openDeleteConfirm(activity, day.dayId)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                                  >
                                    🗑️ Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Cost Summary */}
        {trip.days.some((d) => d.activities.some((a) => a.cost)) && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${calculateTotalCost(trip)} USD
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Per person</span>
                <span className="text-gray-700 dark:text-gray-300">
                  ${(calculateTotalCost(trip) / trip.participants.length).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivityModal}
        onClose={() => {
          setShowAddActivityModal(false);
          setSelectedDayId(null);
          setSelectedDayTitle('');
        }}
        onSubmit={handleAddActivity}
        dayTitle={selectedDayTitle}
      />

      {/* Edit Activity Modal */}
      {editingActivity && (
        <EditActivityModal
          isOpen={showEditActivityModal}
          onClose={() => {
            setShowEditActivityModal(false);
            setEditingActivity(null);
            setEditingActivityDayId(null);
          }}
          onSubmit={handleEditActivity}
          activity={editingActivity}
          dayTitle={selectedDayTitle}
        />
      )}

      {/* Delete Activity Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingActivity(null);
        }}
        onConfirm={handleDeleteActivity}
        title="Delete Activity"
        message={
          <div>
            <p className="mb-2">Are you sure you want to delete <strong>{deletingActivity?.activity.title}</strong>?</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete Activity"
        variant="danger"
        isProcessing={isDeleting}
      />
    </div>
  );
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    flight: '✈️',
    hotel: '🏨',
    restaurant: '🍽️',
    attraction: '🎯',
    transport: '🚗',
    other: '📌',
  };
  return icons[type] || '📌';
}

function calculateTotalCost(trip: Trip): number {
  let total = 0;
  trip.days.forEach((day) => {
    day.activities.forEach((activity) => {
      if (activity.cost) {
        total += activity.cost.amount;
      }
    });
  });
  return total;
}
