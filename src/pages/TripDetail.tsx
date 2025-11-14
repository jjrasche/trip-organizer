import { useState, useEffect, useRef } from 'react';
import { getTrip, subscribeToTrip } from '../services/trip.service';
import { getUser } from '../services/user.service';
import { sendMessage, generateSuggestions, isAIConfigured } from '../services/ai.service';
import type { Trip, User } from '../types';
import AIChat from '../components/AIChat';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!trip || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Trip not found</p>
          <button onClick={onBack} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const userRole = trip.participants.find((p) => p.userId === userId)?.role || 'viewer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{trip.title}</h1>
                <p className="text-sm text-gray-500">
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
                    className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center"
                    title={p.displayName}
                  >
                    <span className="text-xs font-medium text-primary-700">
                      {p.displayName.charAt(0)}
                    </span>
                  </div>
                ))}
                {trip.participants.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
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
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <p className="text-gray-700">{trip.description}</p>
          </div>
        )}

        {/* Participants */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Participants ({trip.participants.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trip.participants.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-medium">
                    {participant.displayName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{participant.displayName}</p>
                  <p className="text-xs text-gray-500">{participant.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Days and Activities */}
        <div className="space-y-6">
          {trip.days.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">No days planned yet</p>
              {(userRole === 'owner' || userRole === 'editor') && (
                <button className="btn-primary">Add First Day</button>
              )}
            </div>
          ) : (
            trip.days.map((day, index) => (
              <div key={day.dayId} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {day.title || `Day ${index + 1}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {day.date.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  {(userRole === 'owner' || userRole === 'editor') && (
                    <button className="text-sm text-primary-600 hover:text-primary-700">
                      + Add Activity
                    </button>
                  )}
                </div>

                {day.activities.length === 0 ? (
                  <p className="text-gray-500 text-sm">No activities planned</p>
                ) : (
                  <div className="space-y-4">
                    {day.activities.map((activity) => (
                      <div
                        key={activity.activityId}
                        className="border-l-4 border-primary-200 pl-4 py-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">{getActivityIcon(activity.type)}</span>
                              <h4 className="font-medium text-gray-900">{activity.title}</h4>
                            </div>

                            {activity.startTime && (
                              <p className="text-sm text-gray-600">
                                {activity.startTime.toDate().toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}

                            {activity.location && (
                              <p className="text-sm text-gray-600">
                                📍 {activity.location.name}
                              </p>
                            )}

                            {activity.cost && (
                              <p className="text-sm text-gray-600">
                                💰 ${activity.cost.amount} {activity.cost.currency}
                              </p>
                            )}

                            {activity.description && (
                              <p className="text-sm text-gray-500 mt-2">
                                {activity.description}
                              </p>
                            )}

                            {/* Coordination Section */}
                            <div className="mt-3 text-sm">
                              <button className="text-primary-600 hover:text-primary-700 font-medium">
                                💬 Coordinate
                              </button>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">
                  ${calculateTotalCost(trip)} USD
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Per person</span>
                <span className="text-gray-700">
                  ${(calculateTotalCost(trip) / trip.participants.length).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
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
