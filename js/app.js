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
  matches: [],
  user: null,
  canEdit: false,
  hasAccess: false,
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
  const resetBtn = document.getElementById("reset-btn");

  if (!state.user) {
    tabs.style.display = "none";
    resetBtn.style.display = "none";

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
    resetBtn.style.display = "none";

    document.getElementById("score-ane").textContent = "-";
    document.getElementById("score-aitor").textContent = "-";
    document.getElementById("played-count").textContent = "-";

    view.innerHTML = `
      <div class="card">
        <h2>Acceso no autorizado</h2>
        <p class="muted">
          Tu cuenta ha iniciado sesión, pero no tiene permisos para ver esta porra.
        </p>
      </div>
    `;
    return;
  }

  tabs.style.display = "flex";
  resetBtn.style.display = "inline-block";

  renderScoreboard(state);
  setActiveTab(state.currentView);

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
  state.canEdit = false;
  state.hasAccess = false;
  state.matches = [];

  if (!user) {
    renderApp();
    return;
  }

  try {
    const remote = await loadRemoteState();

    if (remote?.matches) {
      state.matches = mergeRemoteMatches(baseState.matches, remote.matches);
    } else {
      state.matches = baseState.matches;
      await saveRemoteState({
        ...state,
        matches: state.matches,
      });
    }

    state.canEdit = true;
    state.hasAccess = true;

    unsubscribeRemote = subscribeRemoteState((remoteData) => {
      if (!remoteData?.matches) return;
      state.matches = mergeRemoteMatches(baseState.matches, remoteData.matches);
      renderApp();
    });
  } catch (error) {
    console.error("Error cargando estado remoto:", error);

    state.canEdit = false;
    state.hasAccess = false;
    state.matches = [];

    if (error.code === "permission-denied" || error.code === "firestore/permission-denied") {
      console.warn("Usuario autenticado pero sin permisos");
    } else {
      alert("No se pudo cargar la porra desde Firebase.");
    }
  }

  renderApp();
}

async function init() {
  attachStaticHandlers();
  await finishRedirectSignIn();

  //watchAuth(async (user) => {
  //  await initRemoteForUser(user);
  //});

  watchAuth(async (user) => {
    if (user) {
      console.log("UID:", user.uid);
      console.log("EMAIL:", user.email);
    }
    await initRemoteForUser(user);
  });

  renderApp();
}

init();