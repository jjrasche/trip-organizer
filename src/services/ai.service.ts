import { getAI, getGenerativeModel } from 'firebase/ai';
import { app } from '../config/firebase';
import type { Trip, User, Activity } from '../types';

/**
 * AI Service - Firebase AI Logic with Gemini
 * Provides conversational AI for trip coordination and assistance
 * Uses Firebase AI Logic SDK (no API key needed in code!)
 */

let aiInstance: ReturnType<typeof getAI> | null = null;

/**
 * Initialize AI service
 */
function initAI() {
  if (!aiInstance) {
    try {
      aiInstance = getAI(app);
    } catch (error) {
      console.warn('Firebase AI Logic not configured. Enable it in Firebase Console > AI tab');
    }
  }
  return aiInstance;
}

/**
 * Get Gemini model instance
 */
function getModel() {
  const ai = initAI();
  if (!ai) {
    throw new Error(
      'Firebase AI Logic not enabled. Go to Firebase Console > AI > Firebase AI Logic and click "Get started"'
    );
  }

  return getGenerativeModel(ai, {
    model: 'gemini-1.5-flash',
  });
}

/**
 * Build context for AI about current trip and user
 */
function buildTripContext(trip: Trip, currentUser: User): string {
  const userParticipant = trip.participants.find(p => p.userId === currentUser.userId);
  const role = userParticipant?.role || 'viewer';

  let context = `You are an AI assistant helping with trip planning and coordination.

CURRENT TRIP:
- Title: ${trip.title}
- Dates: ${trip.startDate.toDate().toLocaleDateString()} to ${trip.endDate.toDate().toLocaleDateString()}
- Description: ${trip.description || 'No description'}
- Participants: ${trip.participants.length} people
- Your role: ${role}

CURRENT USER:
- Name: ${currentUser.displayName}
- Phone: ${currentUser.phoneNumber}
- Role: ${role}

TRIP DAYS:
`;

  trip.days.forEach((day, index) => {
    context += `\nDay ${index + 1} (${day.date.toDate().toLocaleDateString()}):\n`;
    if (day.activities.length === 0) {
      context += '  No activities planned\n';
    } else {
      day.activities.forEach((activity) => {
        context += `  - ${activity.title} (${activity.type})`;
        if (activity.startTime) {
          // Handle both string times (e.g., "09:30") and Timestamp objects
          const timeStr = typeof activity.startTime === 'string'
            ? activity.startTime
            : activity.startTime.toDate().toLocaleTimeString();
          context += ` at ${timeStr}`;
          if (activity.endTime) {
            const endTimeStr = typeof activity.endTime === 'string'
              ? activity.endTime
              : activity.endTime.toDate().toLocaleTimeString();
            context += ` - ${endTimeStr}`;
          }
        }
        if (activity.location) {
          context += ` @ ${activity.location.name}`;
        }
        if (activity.cost) {
          context += ` - $${activity.cost.amount} ${activity.cost.currency}`;
        }
        context += '\n';
      });
    }
  });

  context += `\nYOUR CAPABILITIES:
- Answer questions about the trip
- Help coordinate logistics (rides, lodging, etc.)
- Suggest connections between participants with similar needs
- Calculate costs and splits
- Provide trip planning advice
- Help add or modify activities

Be helpful, concise, and proactive. Focus on practical coordination and organization.`;

  return context;
}

/**
 * Send message to AI and get response
 */
export async function sendMessage(
  message: string,
  trip: Trip,
  currentUser: User,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    const model = getModel();
    const context = buildTripContext(trip, currentUser);

    // Build chat history
    const history = conversationHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Start chat with context
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: context }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand the trip context. How can I help you?' }],
        },
        ...history,
      ],
    });

    // Send message
    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error sending message to AI:', error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
}

/**
 * Generate proactive suggestions based on trip state
 */
export async function generateSuggestions(
  trip: Trip,
  currentUser: User
): Promise<string[]> {
  try {
    const model = getModel();
    const context = buildTripContext(trip, currentUser);

    const prompt = `${context}

Based on the current trip state, generate 3-4 short, actionable suggestions for ${currentUser.displayName}.
Focus on:
1. Missing or incomplete information
2. Coordination opportunities (people with similar needs)
3. Upcoming deadlines or actions needed
4. Cost optimization

Format as a simple list of suggestions, each on a new line starting with "• ".
Be specific and actionable.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse suggestions (split by bullet points)
    return text
      .split('\n')
      .filter((line) => line.trim().startsWith('•'))
      .map((line) => line.trim().substring(1).trim())
      .filter((line) => line.length > 0);
  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}

/**
 * Analyze coordination needs and suggest matches
 */
export async function analyzeCoordinationNeeds(
  trip: Trip,
  activityId: string,
  needType: 'transportation' | 'lodging' | 'gear' | 'other',
  currentUser: User
): Promise<{
  matchCount: number;
  suggestion: string;
}> {
  try {
    const model = getModel();
    const context = buildTripContext(trip, currentUser);

    // Find the activity
    let activity: Activity | undefined;
    for (const day of trip.days) {
      activity = day.activities.find((a) => a.activityId === activityId);
      if (activity) break;
    }

    if (!activity) {
      return { matchCount: 0, suggestion: 'Activity not found' };
    }

    const prompt = `${context}

${currentUser.displayName} needs help with ${needType} for the activity "${activity.title}".

Based on typical trip coordination patterns:
1. How many other participants might have similar needs for this activity?
2. What's a helpful, personalized suggestion for ${currentUser.displayName}?

Respond in JSON format:
{
  "matchCount": <estimated number of people with similar needs>,
  "suggestion": "<one sentence personalized suggestion>"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        matchCount: parsed.matchCount || 0,
        suggestion: parsed.suggestion || 'Let me help you coordinate with others!',
      };
    }

    return {
      matchCount: 3, // Default estimate
      suggestion: `Others might need ${needType} too. Want me to help coordinate?`,
    };
  } catch (error: any) {
    console.error('Error analyzing coordination needs:', error);
    return {
      matchCount: 0,
      suggestion: 'Unable to analyze coordination needs right now.',
    };
  }
}

/**
 * Check if AI is configured and ready
 */
export function isAIConfigured(): boolean {
  try {
    const ai = initAI();
    return !!ai;
  } catch {
    return false;
  }
}
