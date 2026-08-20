(function () {
  const STORAGE_KEY = "adventure-engine-state-v1";

  function freshState() {
    return {
      schemaVersion: 1,
      gameId: window.GAME_CONTENT.gameId,
      createdAt: new Date().toISOString(),
      challenges: {},
      inventory: [],
      overrides: { unlocked: [], location: [] },
      message: null,
      history: []
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.gameId !== window.GAME_CONTENT.gameId) return freshState();
      return Object.assign(freshState(), saved);
    } catch (error) {
      console.warn("Saved state could not be read; starting safely.", error);
      return freshState();
    }
  }

  let state = load();

  function save(nextState) {
    state = nextState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("adventure:state", { detail: state }));
    return state;
  }

  window.AdventureStore = {
    get: () => structuredClone(state),
    save,
    reset: () => save(freshState()),
    export: () => JSON.stringify(state, null, 2),
    import: (text) => {
      const candidate = JSON.parse(text);
      if (!candidate || candidate.gameId !== window.GAME_CONTENT.gameId) {
        throw new Error("This backup belongs to a different game.");
      }
      return save(Object.assign(freshState(), candidate));
    },
    key: STORAGE_KEY
  };

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      state = load();
      window.dispatchEvent(new CustomEvent("adventure:state", { detail: state }));
    }
  });
})();
