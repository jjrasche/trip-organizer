import { useState, FormEvent, useEffect } from 'react';
import Modal from './Modal';
import type { Activity, UpdateActivityInput } from '../types';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activityData: UpdateActivityInput) => Promise<void>;
  activity: Activity;
  dayTitle?: string;
}

const activityTypes = [
  { value: 'flight', label: '✈️ Flight', icon: '✈️' },
  { value: 'hotel', label: '🏨 Hotel', icon: '🏨' },
  { value: 'restaurant', label: '🍽️ Restaurant', icon: '🍽️' },
  { value: 'attraction', label: '🎭 Attraction', icon: '🎭' },
  { value: 'transport', label: '🚗 Transport', icon: '🚗' },
  { value: 'other', label: '📍 Other', icon: '📍' },
];

export default function EditActivityModal({ isOpen, onClose, onSubmit, activity, dayTitle }: EditActivityModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'flight' | 'hotel' | 'restaurant' | 'attraction' | 'transport' | 'other'>('other');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [description, setDescription] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form with activity data when modal opens
  useEffect(() => {
    if (isOpen && activity) {
      setTitle(activity.title);
      setType(activity.type);
      setStartTime(activity.startTime || '');
      setEndTime(activity.endTime || '');
      setLocationName(activity.location?.name || '');
      setLocationAddress(activity.location?.address || '');
      setDescription(activity.description || '');
      setCostAmount(activity.cost ? String(activity.cost.amount) : '');
      setCostCurrency(activity.cost?.currency || 'USD');
      setError('');
    }
  }, [isOpen, activity]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Activity title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build location object without undefined fields
      const location: any = locationName.trim() ? {
        name: locationName.trim(),
      } : undefined;
      if (location && locationAddress.trim()) {
        location.address = locationAddress.trim();
      }

      const activityData: UpdateActivityInput = {
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location,
        cost: costAmount ? {
          amount: parseFloat(costAmount),
          currency: costCurrency,
        } : undefined,
      };

      await onSubmit(activityData);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit Activity${dayTitle ? ` in ${dayTitle}` : ''}`} maxWidth="lg">
      <form onSubmit={handleSubmit} data-testid="edit-activity-modal">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="activity-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Visit Eiffel Tower"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Activity Type
            </label>
            <select
              id="activity-type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              {activityTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <input
                id="start-time"
                type="time"
                name="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
              </label>
              <input
                id="end-time"
                type="time"
                name="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location Name
            </label>
            <input
              id="location-name"
              type="text"
              name="location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Eiffel Tower"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="location-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              id="location-address"
              type="text"
              name="address"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g., Champ de Mars, 75007 Paris, France"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="activity-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="activity-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes or details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Cost */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="cost-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost (optional)
              </label>
              <input
                id="cost-amount"
                type="number"
                name="cost"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="cost-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                id="cost-currency"
                name="currency"
                value={costCurrency}
                onChange={(e) => setCostCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
