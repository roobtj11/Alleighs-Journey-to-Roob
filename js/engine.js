(function () {
  const content = window.GAME_CONTENT;
  const store = window.AdventureStore;
  const byId = (id) => content.challenges.find((challenge) => challenge.id === id);
  const normalize = (value) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

  function record(state, text) {
    state.history.unshift({ at: new Date().toISOString(), text });
    state.history = state.history.slice(0, 100);
  }

  function challengeState(state, id) {
    return state.challenges[id] || {};
  }

  function isCompleted(state, id) {
    return Boolean(challengeState(state, id).completedAt);
  }

  function access(challenge, state) {
    if (isCompleted(state, challenge.id)) return { open: true, reason: "Completed" };
    if (state.overrides.unlocked.includes(challenge.id)) return { open: true, reason: "GM unlocked" };
    const req = challenge.requires || {};
    const missingChallenge = (req.completed || []).find((id) => !isCompleted(state, id));
    if (missingChallenge) return { open: false, reason: "Complete an earlier challenge" };
    const missingItem = (req.items || []).find((id) => !state.inventory.includes(id));
    if (missingItem) return { open: false, reason: "A required item is missing" };
    if (req.unlockAt && Date.now() < new Date(req.unlockAt).getTime()) return { open: false, reason: "Not yet available" };
    return { open: true, reason: "Available" };
  }

  function touch(id) {
    const state = store.get();
    state.challenges[id] ||= {};
    state.challenges[id].firstViewedAt ||= new Date().toISOString();
    store.save(state);
  }

  function complete(id, source) {
    const challenge = byId(id);
    const state = store.get();
    if (!challenge || isCompleted(state, id)) return state;
    state.challenges[id] ||= {};
    state.challenges[id].completedAt = new Date().toISOString();
    state.challenges[id].completedBy = source;
    (challenge.rewards || []).forEach((item) => {
      if (!state.inventory.includes(item)) state.inventory.push(item);
    });
    record(state, `${challenge.title} completed${source === "gm" ? " by Game Master" : ""}.`);
    return store.save(state);
  }

  function submitAnswer(id, answer) {
    const challenge = byId(id);
    const state = store.get();
    if (!challenge || challenge.type !== "answer") return { ok: false, message: "This challenge does not accept an answer." };
    state.challenges[id] ||= {};
    state.challenges[id].submissions ||= [];
    state.challenges[id].submissions.push({ answer, at: new Date().toISOString() });
    const ok = challenge.answers.some((candidate) => normalize(candidate) === normalize(answer));
    record(state, ok ? `Correct answer submitted for ${challenge.title}.` : `Answer attempted for ${challenge.title}.`);
    store.save(state);
    if (ok) complete(id, "player");
    return { ok, message: ok ? "The mechanism yields. You found it." : "That does not open the way. Try again." };
  }

  function useHint(id, index) {
    const challenge = byId(id);
    const state = store.get();
    const progress = challengeState(state, id);
    const hint = challenge?.hints?.[index];
    if (!hint || !progress.firstViewedAt) return { ok: false, message: "Hint unavailable." };
    const availableAt = new Date(progress.firstViewedAt).getTime() + hint.availableAfterSeconds * 1000;
    if (Date.now() < availableAt) return { ok: false, message: "The hint is still sealed." };
    state.challenges[id].hintsUsed ||= [];
    if (!state.challenges[id].hintsUsed.includes(index)) {
      state.challenges[id].hintsUsed.push(index);
      record(state, `Hint used for ${challenge.title}.`);
      store.save(state);
    }
    return { ok: true, message: hint.text };
  }

  function distanceMeters(aLat, aLon, bLat, bLon) {
    const rad = (degrees) => degrees * Math.PI / 180;
    const earth = 6371000;
    const dLat = rad(bLat - aLat);
    const dLon = rad(bLon - aLon);
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function verifyLocation(id, position) {
    const challenge = byId(id);
    if (!challenge?.location) return { ok: false, message: "No location is configured." };
    const state = store.get();
    if (state.overrides.location.includes(id)) {
      complete(id, "player");
      return { ok: true, message: "Location requirement was waived by the Game Master." };
    }
    const distance = distanceMeters(position.coords.latitude, position.coords.longitude, challenge.location.latitude, challenge.location.longitude);
    state.challenges[id] ||= {};
    state.challenges[id].lastLocationCheck = { at: new Date().toISOString(), distanceMeters: Math.round(distance), accuracyMeters: Math.round(position.coords.accuracy) };
    record(state, `Location checked for ${challenge.title}: ${Math.round(distance)} m away.`);
    store.save(state);
    const ok = distance <= challenge.location.radiusMeters;
    if (ok) complete(id, "player");
    return { ok, distance, message: ok ? "You are in the right place." : `You are about ${Math.round(distance)} meters from the target.` };
  }

  function toggleOverride(kind, id) {
    const state = store.get();
    const list = state.overrides[kind];
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1); else list.push(id);
    record(state, `${kind === "location" ? "Location" : "Unlock"} override ${index >= 0 ? "removed" : "enabled"} for ${byId(id).title}.`);
    return store.save(state);
  }

  window.AdventureEngine = {
    content,
    byId,
    access,
    isCompleted,
    challengeState,
    touch,
    complete,
    submitAnswer,
    useHint,
    verifyLocation,
    toggleOverride,
    record
  };
})();
