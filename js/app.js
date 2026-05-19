import { createInitialState, mergeRemoteMatches } from "./state.js";
import {
  finishRedirectSignIn,
  loadRemoteState,
  saveRemoteState,
  subscribeRemoteState,
  watchAuth,
  signInGoogle,
  logOut,
} from "./firebase.js";
import { renderScoreboard, renderContent } from "./ui.js";

const baseState = createInitialState();

let state = {
  currentView: "home",
  matches: baseState.matches,
  user: null,
  canEdit: false,
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
}

function renderApp() {
  renderScoreboard(state);
  renderAuthBox();
  setActiveTab(state.currentView);

  const view = document.getElementById("view");
  view.innerHTML = "";
  view.appendChild(renderContent(state, handleMatchChange));
}

async function handleMatchChange(matchId, homeGoals, awayGoals) {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return;

  match.homeGoals = homeGoals;
  match.awayGoals = awayGoals;

  renderApp();

  if (state.canEdit) {
    try {
      await saveRemoteState(state);
    } catch (error) {
      console.error("Error guardando en Firestore:", error);
      alert("No se pudo guardar el cambio en Firebase.");
    }
  }
}

async function handleReset() {
  if (!state.canEdit) {
    alert("Debes iniciar sesión para resetear.");
    return;
  }

  if (!confirm("¿Seguro que quieres resetear todos los resultados?")) return;

  state.matches = baseState.matches.map((m) => ({
    ...m,
    homeGoals: null,
    awayGoals: null,
  }));

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error("Error reseteando en Firestore:", error);
    alert("No se pudo resetear en Firebase.");
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
  state.canEdit = !!user;

  if (!user) {
    state.matches = baseState.matches;
    renderApp();
    return;
  }

  try {
    const remote = await loadRemoteState();
    if (remote?.matches) {
      state.matches = mergeRemoteMatches(baseState.matches, remote.matches);
    } else {
      state.matches = baseState.matches;
      await saveRemoteState(state);
    }

    unsubscribeRemote = subscribeRemoteState((remoteData) => {
      if (!remoteData?.matches) return;
      state.matches = mergeRemoteMatches(baseState.matches, remoteData.matches);
      renderApp();
    });
  } catch (error) {
    console.error("Error cargando estado remoto:", error);
    alert("No se pudo cargar la porra desde Firebase.");
  }

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