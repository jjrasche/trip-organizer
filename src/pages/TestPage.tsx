/**
 * Simple test page to verify React rendering without Firebase
 */
export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Trip Organizer
        </h1>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-semibold text-green-900 mb-2">✅ React Working</h2>
            <p className="text-sm text-green-700">The React app is rendering correctly</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="font-semibold text-blue-900 mb-2">📦 Test Data</h2>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• User: Test User (+1 415 301 8471)</li>
              <li>• Trips: Paris Adventure 2025, Tokyo Trip 2024</li>
              <li>• Status: Seeded successfully</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h2 className="font-semibold text-yellow-900 mb-2">⚠️ Known Issues</h2>
            <p className="text-sm text-yellow-700">
              Dashboard may be stuck loading due to Firebase connection.
              Using this test page to verify app structure.
            </p>
          </div>

          <button
            className="w-full btn-primary"
            onClick={() => console.log('Test button clicked!')}
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}
