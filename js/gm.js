(function () {
  const app = document.querySelector("#gm-app");
  const engine = window.AdventureEngine;
  const store = window.AdventureStore;
  const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

  function render() {
    const state = store.get();
    const completed = engine.content.challenges.filter((challenge) => engine.isCompleted(state, challenge.id)).length;
    app.innerHTML = `<section class="grid gm-grid">
      <article class="card gm-wide">
        <span class="eyebrow">Prototype control room</span><h1>Game state</h1>
        <p>This page controls this browser's saved game. Cross-device control needs the later shared-backend upgrade.</p>
        <div class="gm-summary">
          <div class="stat"><strong>${completed}/${engine.content.challenges.length}</strong><span>Complete</span></div>
          <div class="stat"><strong>${state.inventory.length}</strong><span>Items</span></div>
          <div class="stat"><strong>${state.history.length}</strong><span>Events</span></div>
        </div>
      </article>
      <article class="card">
        <h2>Challenges</h2>
        ${engine.content.challenges.map((challenge) => challengeRow(challenge, state)).join("")}
      </article>
      <article class="card">
        <h2>Send a message</h2>
        <form id="message-form"><div class="field"><label for="message">Player message</label><textarea id="message" name="message" rows="3">${escapeHtml(state.message?.text || "")}</textarea></div><div class="actions"><button class="btn" type="submit">Publish locally</button><button class="btn secondary" type="button" id="clear-message">Clear</button></div></form>
        <h2>Save & recovery</h2>
        <div class="actions"><button class="btn secondary" id="export">Export backup</button><label class="btn secondary">Import backup<input class="sr-only" id="import" type="file" accept="application/json"></label><button class="btn danger" id="reset">Reset test game</button></div>
      </article>
      <article class="card gm-wide">
        <h2>Recent activity</h2>
        ${state.history.length ? `<ul class="history">${state.history.slice(0, 20).map((event) => `<li><time>${new Date(event.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><span>${escapeHtml(event.text)}</span></li>`).join("")}</ul>` : `<p class="empty">No activity yet.</p>`}
      </article>
    </section>`;
    bind();
  }

  function challengeRow(challenge, state) {
    const progress = engine.challengeState(state, challenge.id);
    const done = engine.isCompleted(state, challenge.id);
    const unlocked = state.overrides.unlocked.includes(challenge.id);
    const locationOverride = state.overrides.location.includes(challenge.id);
    const lastAnswer = progress.submissions?.at(-1)?.answer;
    return `<div class="gm-row">
      <div class="gm-row-head"><div><strong>${escapeHtml(challenge.title)}</strong><span class="challenge-meta">${done ? `Completed ${new Date(progress.completedAt).toLocaleString()}` : engine.access(challenge, state).reason}${lastAnswer ? ` · Last answer: “${escapeHtml(lastAnswer)}”` : ""}</span></div><span class="status ${done ? "done" : ""}">${done ? "Done" : "Active"}</span></div>
      <div class="actions">
        <button class="btn secondary" data-complete="${challenge.id}" ${done ? "disabled" : ""}>Force complete</button>
        <button class="btn secondary" data-unlock="${challenge.id}">${unlocked ? "Remove unlock" : "Force unlock"}</button>
        ${challenge.location ? `<button class="btn secondary" data-location="${challenge.id}">${locationOverride ? "Restore GPS" : "Waive GPS"}</button>` : ""}
      </div>
    </div>`;
  }

  function bind() {
    app.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => engine.complete(button.dataset.complete, "gm")));
    app.querySelectorAll("[data-unlock]").forEach((button) => button.addEventListener("click", () => engine.toggleOverride("unlocked", button.dataset.unlock)));
    app.querySelectorAll("[data-location]").forEach((button) => button.addEventListener("click", () => engine.toggleOverride("location", button.dataset.location)));
    document.querySelector("#message-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const state = store.get();
      const text = new FormData(event.currentTarget).get("message").trim();
      state.message = text ? { text, at: new Date().toISOString() } : null;
      engine.record(state, text ? "Game Master published a message." : "Game Master cleared the message.");
      store.save(state);
    });
    document.querySelector("#clear-message").addEventListener("click", () => {
      const state = store.get(); state.message = null; engine.record(state, "Game Master cleared the message."); store.save(state);
    });
    document.querySelector("#export").addEventListener("click", () => {
      const blob = new Blob([store.export()], { type: "application/json" });
      const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `adventure-backup-${new Date().toISOString().slice(0, 10)}.json` });
      link.click(); URL.revokeObjectURL(link.href);
    });
    document.querySelector("#import").addEventListener("change", async (event) => {
      try { store.import(await event.target.files[0].text()); alert("Backup imported."); } catch (error) { alert(error.message); }
    });
    document.querySelector("#reset").addEventListener("click", () => { if (confirm("Erase all prototype progress on this device?")) store.reset(); });
  }

  window.addEventListener("adventure:state", render);
  render();
})();
