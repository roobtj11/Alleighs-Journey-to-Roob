(function () {
  const app = document.querySelector("#app");
  const engine = window.AdventureEngine;
  const store = window.AdventureStore;
  let feedback = null;

  const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

  function dashboard() {
    const state = store.get();
    const challenges = engine.content.challenges;
    const completed = challenges.filter((challenge) => engine.isCompleted(state, challenge.id)).length;
    const current = challenges.find((challenge) => !engine.isCompleted(state, challenge.id) && engine.access(challenge, state).open);
    const message = state.message ? `<div class="message"><span class="eyebrow">A message arrived</span><p>${escapeHtml(state.message.text)}</p></div>` : "";
    app.innerHTML = `
      <section class="hero">
        <span class="eyebrow">Prototype adventure</span>
        <h1>${escapeHtml(engine.content.title)}</h1>
        <p>${escapeHtml(engine.content.intro)}</p>
        <div class="progress-track" aria-label="${completed} of ${challenges.length} complete"><div class="progress-fill" style="width:${challenges.length ? completed / challenges.length * 100 : 0}%"></div></div>
      </section>
      ${message}
      <section class="grid dashboard">
        <article class="card objective">
          <span class="eyebrow">Current objective</span>
          <h2>${current ? escapeHtml(current.title) : "All test objectives complete"}</h2>
          <p>${current ? escapeHtml(current.summary) : "The prototype has reached its end."}</p>
          ${current ? `<button class="btn" data-open="${current.id}">Continue</button>` : ""}
        </article>
        <article class="card">
          <h2>Challenges</h2>
          <div class="challenge-list">${challenges.map((challenge, index) => challengeButton(challenge, state, index)).join("")}</div>
        </article>
        <aside class="card">
          <h2>Inventory</h2>
          <div class="inventory">${state.inventory.length ? state.inventory.map((id) => {
            const item = engine.content.items[id];
            return `<span class="item" title="${escapeHtml(item.description)}">${item.icon} ${escapeHtml(item.name)}</span>`;
          }).join("") : `<span class="empty">Nothing collected yet.</span>`}</div>
        </aside>
      </section>`;
    bindDashboard();
  }

  function challengeButton(challenge, state, index) {
    const access = engine.access(challenge, state);
    const done = engine.isCompleted(state, challenge.id);
    return `<button class="challenge" data-open="${challenge.id}" ${access.open ? "" : "disabled"}>
      <span class="challenge-icon">${done ? "✓" : access.open ? index + 1 : "⌁"}</span>
      <span><span class="challenge-title">${escapeHtml(challenge.title)}</span><span class="challenge-meta">${escapeHtml(access.reason)}</span></span>
      <span class="status ${done ? "done" : ""}">${done ? "Done" : access.open ? "Open" : "Locked"}</span>
    </button>`;
  }

  function detail(id) {
    const challenge = engine.byId(id);
    const state = store.get();
    if (!challenge || !engine.access(challenge, state).open) { location.hash = ""; return; }
    engine.touch(id);
    const latest = store.get();
    const progress = engine.challengeState(latest, id);
    const done = engine.isCompleted(latest, id);
    app.innerHTML = `<section class="detail">
      <a class="back" href="#">← Dashboard</a>
      <div class="card">
        <div class="detail-head"><span class="eyebrow">${escapeHtml(challenge.chapter)}</span><h1>${escapeHtml(challenge.title)}</h1></div>
        <div class="prose"><p>${escapeHtml(challenge.body)}</p></div>
        ${feedback ? `<div class="notice ${feedback.ok ? "good" : "error"}">${escapeHtml(feedback.message)}</div>` : ""}
        ${done ? completedPanel(challenge) : challenge.type === "answer" ? answerPanel(challenge, progress) : locationPanel(challenge, latest)}
      </div>
    </section>`;
    bindDetail(challenge, progress);
  }

  function answerPanel(challenge, progress) {
    const hints = (challenge.hints || []).map((hint, index) => {
      const used = (progress.hintsUsed || []).includes(index);
      const readyAt = new Date(progress.firstViewedAt).getTime() + hint.availableAfterSeconds * 1000;
      const seconds = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
      return used ? `<div class="hint">${escapeHtml(hint.text)}</div>` : `<button class="btn secondary" data-hint="${index}" ${seconds ? "disabled" : ""}>${seconds ? `Hint in ${seconds}s` : "Reveal hint"}</button>`;
    }).join("");
    return `<form id="answer-form"><div class="field"><label for="answer">Your answer</label><input id="answer" name="answer" autocomplete="off" required></div><button class="btn" type="submit">Submit answer</button></form><div class="actions">${hints}</div>`;
  }

  function locationPanel(challenge, state) {
    const waived = state.overrides.location.includes(challenge.id);
    return `<div class="notice">Target radius: ${challenge.location.radiusMeters} m${waived ? " · GM override active" : ""}</div><button class="btn" id="check-location">Check my location</button><p class="eyebrow">Your browser will ask permission. GPS works on HTTPS or localhost.</p>`;
  }

  function completedPanel(challenge) {
    const rewards = (challenge.rewards || []).map((id) => engine.content.items[id]?.name).filter(Boolean);
    return `<div class="notice good"><strong>Challenge complete.</strong>${rewards.length ? ` You received: ${escapeHtml(rewards.join(", "))}.` : ""}</div><a class="btn" href="#">Return to dashboard</a>`;
  }

  function bindDashboard() {
    app.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => { feedback = null; location.hash = `challenge/${button.dataset.open}`; }));
  }

  function bindDetail(challenge) {
    const form = document.querySelector("#answer-form");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      feedback = engine.submitAnswer(challenge.id, new FormData(form).get("answer"));
      detail(challenge.id);
    });
    app.querySelectorAll("[data-hint]").forEach((button) => button.addEventListener("click", () => {
      feedback = engine.useHint(challenge.id, Number(button.dataset.hint));
      detail(challenge.id);
    }));
    document.querySelector("#check-location")?.addEventListener("click", () => {
      feedback = { ok: true, message: "Finding your position…" };
      detail(challenge.id);
      if (!navigator.geolocation) { feedback = { ok: false, message: "This browser does not provide location." }; detail(challenge.id); return; }
      navigator.geolocation.getCurrentPosition(
        (position) => { feedback = engine.verifyLocation(challenge.id, position); detail(challenge.id); },
        (error) => { feedback = { ok: false, message: `Location unavailable: ${error.message}` }; detail(challenge.id); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  function route() {
    const match = location.hash.match(/^#challenge\/(.+)$/);
    if (match) detail(match[1]); else dashboard();
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("adventure:state", route);
  window.addEventListener("online", () => document.querySelector("#connection-status").textContent = "Online");
  window.addEventListener("offline", () => document.querySelector("#connection-status").textContent = "Offline");
  setInterval(() => { if (location.hash && document.querySelector("[data-hint]")) route(); }, 1000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(console.warn);
  route();
})();
