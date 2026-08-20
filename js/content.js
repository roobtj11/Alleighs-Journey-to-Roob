// This is the main file to edit when authoring the adventure.
// Keep IDs stable after a game has started so saved progress still matches.
window.GAME_CONTENT = {
  gameId: "adventure-demo",
  contentVersion: 1,
  title: "A Door Left Ajar",
  intro: "A tiny demonstration adventure. Nothing here is part of the real story.",
  items: {
    brass_key: { name: "Brass Key", icon: "🗝️", description: "A generic test reward." }
  },
  challenges: [
    {
      id: "first_signal",
      chapter: "Test Chapter",
      title: "The First Signal",
      summary: "Solve a simple text puzzle.",
      body: "I glow in the dark, but I am not a star. I can be carried, but I am not a bag. What am I?",
      type: "answer",
      answers: ["lantern", "a lantern"],
      hints: [
        { text: "It is a portable source of light.", availableAfterSeconds: 10 }
      ],
      rewards: ["brass_key"]
    },
    {
      id: "marked_place",
      chapter: "Test Chapter",
      title: "The Marked Place",
      summary: "Demonstrates prerequisite, inventory, and GPS checks.",
      body: "This test target is downtown Chicago. In the real game, replace the coordinates and radius in content.js. The Game Master can override this requirement during testing.",
      type: "location",
      requires: {
        completed: ["first_signal"],
        items: ["brass_key"]
      },
      location: {
        latitude: 41.8781,
        longitude: -87.6298,
        radiusMeters: 250,
        label: "Demo location"
      },
      rewards: []
    }
  ]
};
