import {
  finishRedirectSignIn,
  loadPrivateConfig,
  loadRemoteState,
  saveRemoteState,
  subscribeRemoteState,
  watchAuth,
  signInGoogle,
  logOut,
} from "./firebase.js";

import {
  enrichTeamsWithGroups,
  buildMatchesFromConfig,
  mergeRemoteMatches,
} from "./state.js";

import { renderScoreboard, renderContent } from "./ui.js";

let state = {
  currentView: "home",
  user: null,
  hasAccess: false,
  canEdit: false,
  authChecked: false,
  teams: [],
  groups: {},
  schedule: {},
  matches: [],
};

let unsubscribeRemote = null;

function setActiveTab(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
}

function renderAuthBox() {
  const authBox = document.getElementById("auth-box");
  if (!authBox) return;

  if (state.user) {
    authBox.innerHTML = `
      <span class="pill">${state.user.displayName || state.user.email}</span>
      <button class="btn" id="logout-btn">Salir</button>
    `;

    document.getElementById("logout-btn").addEventListener("click", async () => {
      await logOut();
    });
  } else {
    authBox.innerHTML = `
      <button class="btn primary" id="login-btn">Entrar con Google</button>
    `;

    document.getElementById("login-btn").addEventListener("click", async () => {
      await signInGoogle();
    });
  }

  document.getElementById("reset-btn").style.display = state.hasAccess ? "inline-block" : "none";
}

function renderApp() {
  renderAuthBox();

  const tabs = document.querySelector(".tabs");
  const view = document.getElementById("view");

  if (!state.authChecked) {
    tabs.style.display = "none";
    document.getElementById("reset-btn").style.display = "none";

    document.getElementById("score-ane").textContent = "-";
    document.getElementById("score-aitor").textContent = "-";
    document.getElementById("played-count").textContent = "-";

    view.innerHTML = `
      <div class="card">
        <h2>Comprobando sesión...</h2>
        <p class="muted">Un momento.</p>
      </div>
    `;
    return;
  }

  if (!state.user) {
    tabs.style.display = "none";
    document.getElementById("score-ane").textContent = "-";
    document.getElementById("score-aitor").textContent = "-";
    document.getElementById("played-count").textContent = "-";

    view.innerHTML = `
      <div class="card">
        <h2>Inicia sesión para acceder</h2>
        <p class="muted">Esta porra es privada.</p>
      </div>
    `;
    return;
  }

  if (!state.hasAccess) {
    tabs.style.display = "none";
    document.getElementById("score-ane").textContent = "-";
    document.getElementById("score-aitor").textContent = "-";
    document.getElementById("played-count").textContent = "-";

    view.innerHTML = `
      <div class="card">
        <h2>Acceso no autorizado</h2>
        <p class="muted">Tu cuenta no tiene permisos para ver esta porra.</p>
      </div>
    `;
    return;
  }

  tabs.style.display = "flex";

  renderScoreboard(state);
  setActiveTab(state.currentView);

  view.innerHTML = "";
  view.appendChild(renderContent(state, handleMatchChange));
}

async function handleMatchChange(matchId, homeGoals, awayGoals) {
  if (!state.canEdit) return;

  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return;

  match.homeGoals = homeGoals;
  match.awayGoals = awayGoals;

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error("Error guardando en Firestore:", error);
    alert("No se pudo guardar el cambio.");
  }
}

async function handleReset() {
  if (!state.canEdit) return;

  if (!confirm("¿Seguro que quieres resetear todos los resultados?")) return;

  state.matches = state.matches.map((m) => ({
    ...m,
    homeGoals: null,
    awayGoals: null,
  }));

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error("Error reseteando:", error);
    alert("No se pudo resetear.");
  }
}

function attachStaticHandlers() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.currentView = tab.dataset.view;
      renderApp();
    });
  });

  document.getElementById("reset-btn").addEventListener("click", handleReset);
}

async function initRemoteForUser(user) {
  if (unsubscribeRemote) {
    unsubscribeRemote();
    unsubscribeRemote = null;
  }

  state.user = user || null;
  state.hasAccess = false;
  state.canEdit = false;
  state.teams = [];
  state.groups = {};
  state.schedule = {};
  state.matches = [];

  if (!user) {
    state.authChecked = true;
    renderApp();
    return;
  }

  try {
    const config = await loadPrivateConfig();
    if (!config?.teams || !config?.groups) {
      throw new Error("Config privada incompleta");
    }

    state.teams = enrichTeamsWithGroups(config.teams, config.groups);
    state.groups = config.groups;
    state.schedule = config.schedule || {};

    const baseMatches = buildMatchesFromConfig(state.groups, state.schedule);

    const remote = await loadRemoteState();
    if (remote?.matches) {
      state.matches = mergeRemoteMatches(baseMatches, remote.matches);
    } else {
      state.matches = baseMatches;
      await saveRemoteState(state);
    }

    state.hasAccess = true;
    state.canEdit = true;

    unsubscribeRemote = subscribeRemoteState((remoteData) => {
      const freshBaseMatches = buildMatchesFromConfig(state.groups, state.schedule);
      state.matches = mergeRemoteMatches(freshBaseMatches, remoteData?.matches || []);
      renderApp();
    });
  } catch (error) {
    console.error("Error cargando datos privados:", error);
    state.hasAccess = false;
    state.canEdit = false;
    state.teams = [];
    state.groups = {};
    state.schedule = {};
    state.matches = [];
  }

  state.authChecked = true;
  renderApp();
}

async function init() {
  attachStaticHandlers();
  await finishRedirectSignIn();

  watchAuth(async (user) => {
    await initRemoteForUser(user);
  });

  renderApp();
}

init();