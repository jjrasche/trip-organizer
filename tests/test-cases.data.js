/**
 * DECLARATIVE TEST CASES
 *
 * This is the ONLY file that needs to change when adding new tests.
 * AI simply adds more test case objects here.
 *
 * Each test case is a pure data object:
 * - name: Human-readable description
 * - action: What to do (createTrip, addActivity, etc.)
 * - data: Input data for the action
 * - verify: What to check (UI and/or database)
 */

export const TRIP_CREATION_TESTS = [
  {
    name: "Create trip with minimum required fields",
    action: "createTrip",
    data: {
      title: "Quick Weekend",
      startDate: "2025-06-14",
      endDate: "2025-06-16",
    },
    verify: {
      ui: "Dashboard shows trip with title 'Quick Weekend'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Quick Weekend" },
        assert: { dayCount: 3, participantCount: 1 }
      }
    }
  },

  {
    name: "Create trip with all optional fields",
    action: "createTrip",
    data: {
      title: "Luxury Europe Tour",
      description: "3-week European adventure",
      startDate: "2025-09-01",
      endDate: "2025-09-21",
      coverImageUrl: "https://example.com/europe.jpg"
    },
    verify: {
      ui: "Dashboard shows trip with title 'Luxury Europe Tour'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Luxury Europe Tour" },
        assert: {
          dayCount: 21,
          description: "3-week European adventure",
          participantCount: 1
        }
      }
    }
  },

  {
    name: "Create single-day trip",
    action: "createTrip",
    data: {
      title: "Day Trip to Wine Country",
      startDate: "2025-07-15",
      endDate: "2025-07-15", // Same day
    },
    verify: {
      ui: "Dashboard shows trip with title 'Day Trip to Wine Country'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Day Trip to Wine Country" },
        assert: { dayCount: 1 }
      }
    }
  }
];

export const ACTIVITY_TESTS = [
  {
    name: "Add restaurant activity",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 0,
      activity: {
        title: "Le Jules Verne",
        type: "restaurant",
        startTime: "20:00",
        endTime: "22:30",
        location: "Eiffel Tower, Paris",
        cost: 250,
        currency: "EUR",
        description: "Fine dining at the Eiffel Tower"
      }
    },
    verify: {
      ui: "Activity card shows 'Le Jules Verne' with time '20:00'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { hasActivity: "Le Jules Verne" }
      }
    }
  },

  {
    name: "Add attraction with zero cost",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 1,
      activity: {
        title: "Notre-Dame Cathedral",
        type: "attraction",
        startTime: "14:00",
        endTime: "16:00",
        location: "Île de la Cité, Paris",
        cost: 0,
        currency: "EUR"
      }
    },
    verify: {
      ui: "Activity card shows 'Notre-Dame Cathedral'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { hasActivity: "Notre-Dame Cathedral" }
      }
    }
  },

  {
    name: "Add flight activity",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 0,
      activity: {
        title: "SFO to CDG",
        type: "flight",
        startTime: "11:00",
        endTime: "19:30",
        flightNumber: "AF083",
        cost: 850,
        currency: "USD"
      }
    },
    verify: {
      ui: "Activity card shows 'SFO to CDG' with flight icon",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { hasActivity: "SFO to CDG" }
      }
    }
  }
];

export const EDIT_TESTS = [
  {
    name: "Update trip title",
    action: "editTrip",
    data: {
      tripId: "trip-paris-2025",
      updates: {
        title: "Paris & Provence 2025"
      }
    },
    verify: {
      ui: "Trip card shows 'Paris & Provence 2025'",
      db: {
        collection: "trips",
        id: "trip-paris-2025",
        assert: { title: "Paris & Provence 2025" }
      }
    }
  },

  {
    name: "Update trip description",
    action: "editTrip",
    data: {
      tripId: "trip-paris-2025",
      updates: {
        description: "Extended to include wine region"
      }
    },
    verify: {
      ui: "Trip detail shows 'Extended to include wine region'",
      db: {
        collection: "trips",
        id: "trip-paris-2025",
        assert: { description: "Extended to include wine region" }
      }
    }
  },

  {
    name: "Update activity details",
    action: "editActivity",
    data: {
      tripTitle: "Paris 2025",
      activityTitle: "Le Jules Verne",
      updates: {
        startTime: "19:00", // Changed from 20:00
        cost: 300 // Increased price
      }
    },
    verify: {
      ui: "Activity shows time '19:00' and cost '€300'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { activityHasField: { title: "Le Jules Verne", field: "cost", value: 300 } }
      }
    }
  }
];

export const DELETE_TESTS = [
  {
    name: "Delete activity from trip",
    action: "deleteActivity",
    data: {
      tripTitle: "Paris 2025",
      activityTitle: "Le Jules Verne"
    },
    verify: {
      ui: "Activity 'Le Jules Verne' is not visible",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { notHasActivity: "Le Jules Verne" }
      }
    }
  },

  {
    name: "Delete entire trip",
    action: "deleteTrip",
    data: {
      tripId: "trip-paris-2025"
    },
    verify: {
      ui: "Trip 'Paris 2025' is not visible on dashboard",
      db: {
        collection: "trips",
        id: "trip-paris-2025",
        assert: { notExists: true }
      }
    }
  }
];

export const VALIDATION_TESTS = [
  {
    name: "Reject trip with end date before start date",
    action: "createTrip",
    data: {
      title: "Invalid Trip",
      startDate: "2025-07-10",
      endDate: "2025-07-05" // Before start!
    },
    expectError: true,
    verify: {
      ui: "Error message shows 'End date must be after start date'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Invalid Trip" },
        assert: { notExists: true }
      }
    }
  },

  {
    name: "Reject trip with empty title",
    action: "createTrip",
    data: {
      title: "",
      startDate: "2025-07-01",
      endDate: "2025-07-07"
    },
    expectError: true,
    verify: {
      ui: "Error message shows 'Title is required'"
    }
  },

  {
    name: "Reject activity with invalid time range",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 0,
      activity: {
        title: "Invalid Activity",
        startTime: "23:00",
        endTime: "01:00" // After midnight - invalid!
      }
    },
    expectError: true,
    verify: {
      ui: "Error message shows 'End time must be after start time'"
    }
  }
];

export const REGRESSION_TESTS = [
  {
    name: "[BUG-001] Trip creation fails with emoji in title",
    action: "createTrip",
    data: {
      title: "Paris Trip 🗼🥐",
      description: "Testing emoji support",
      startDate: "2025-07-01",
      endDate: "2025-07-07"
    },
    verify: {
      ui: "Dashboard shows trip with title 'Paris Trip 🗼🥐'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris Trip 🗼🥐" },
        assert: { title: "Paris Trip 🗼🥐" }
      }
    }
  },

  {
    name: "[BUG-002] Activity cost not saving decimal values",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 0,
      activity: {
        title: "Taxi to Airport",
        type: "transportation",
        cost: 45.75, // Decimal value
        currency: "EUR"
      }
    },
    verify: {
      ui: "Activity shows cost '€45.75'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { activityHasField: { title: "Taxi to Airport", field: "cost", value: 45.75 } }
      }
    }
  }
];

// Export all test suites
export const ALL_TESTS = [
  ...TRIP_CREATION_TESTS,
  ...ACTIVITY_TESTS,
  ...EDIT_TESTS,
  ...DELETE_TESTS,
  ...VALIDATION_TESTS,
  ...REGRESSION_TESTS
];
