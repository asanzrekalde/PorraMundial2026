const TOURNAMENT_START = new Date("2026-06-11T15:00:00-04:00");

const VALID_VIEWS = new Set([
  "home",
  "ane",
  "aitor",
  "groups",
  "matches",
  "knockout",
]);

function getSavedView() {
  const savedView = localStorage.getItem("porra-current-view");

  return VALID_VIEWS.has(savedView)
    ? savedView
    : "home";
}

function isResetAllowed() {
  return state.hasAccess && new Date() < TOURNAMENT_START;
}

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

const RESET_ENABLED = false;

let state = {
  currentView: getSavedView(),
  user: null,
  hasAccess: false,
  canEdit: false,
  authChecked: false,
  teams: [],
  groups: {},
  schedule: {},
  matches: [],
  knockoutResults: {},
  thirdAssignments: {},
  thirdQualifiedGroupsOverride: [],
};

let unsubscribeRemote = null;
let groupSaveTimer = null;
let deferredRenderTimer = null;

function isEditingGroupScore() {
  return document.activeElement?.classList?.contains(
    "group-score-input"
  );
}

function scheduleGroupSave() {
  clearTimeout(groupSaveTimer);

  groupSaveTimer = setTimeout(async () => {
    try {
      await saveRemoteState(state);
    } catch (error) {
      console.error(
        "Error guardando resultado de grupos:",
        error
      );

      alert("No se pudo guardar el resultado.");
    }
  }, 350);
}

function scheduleRenderAfterScoreEditing() {
  clearTimeout(deferredRenderTimer);

  deferredRenderTimer = setTimeout(() => {
    if (isEditingGroupScore()) {
      scheduleRenderAfterScoreEditing();
      return;
    }

    renderApp();
  }, 250);
}

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

  const resetBtn = document.getElementById("reset-btn");

  if (resetBtn) {
    resetBtn.style.display =
      RESET_ENABLED && state.hasAccess
        ? "inline-block"
        : "none";

    resetBtn.disabled = !RESET_ENABLED;
  }

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
  view.appendChild(
    renderContent(
      state,
      handleMatchChange,
      handleKnockoutChange,
      handleThirdQualifiedGroupsChange
    )
  );
}

function hasAnyResults() {
  const hasGroupResults = state.matches.some(
    (match) =>
      match.homeGoals != null ||
      match.awayGoals != null
  );

  const hasKnockoutResults = Object.values(
    state.knockoutResults || {}
  ).some(
    (result) =>
      result.homeGoals != null ||
      result.awayGoals != null ||
      result.winnerTeamId != null
  );

  return hasGroupResults || hasKnockoutResults;
}

function handleMatchChange(
  matchId,
  homeGoals,
  awayGoals
) {
  if (!state.canEdit) return;

  const match = state.matches.find(
    (item) => item.id === matchId
  );

  if (!match) return;

  match.homeGoals = homeGoals;
  match.awayGoals = awayGoals;

  // Actualizamos solo el marcador superior.
  // No destruimos ni recreamos los inputs.
  renderScoreboard(state);

  // Guardado remoto agrupado para evitar peticiones innecesarias.
  scheduleGroupSave();
}

async function handleKnockoutChange(matchId, nextResult) {
  if (!state.canEdit) return;

  const cleanGoal = (value) =>
    Number.isInteger(value) && value >= 0
      ? value
      : null;

  const cleanResult = {
    homeGoals: cleanGoal(nextResult.homeGoals),
    awayGoals: cleanGoal(nextResult.awayGoals),
    winnerTeamId:
      typeof nextResult.winnerTeamId === "string" &&
      nextResult.winnerTeamId.length > 0
        ? nextResult.winnerTeamId
        : null,
  };

  state.knockoutResults = {
    ...(state.knockoutResults || {}),
    [matchId]: cleanResult,
  };

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error("Error guardando resultado KO:", error);
    alert("No se pudo guardar el resultado de la eliminatoria.");
  }
}

async function handleThirdQualifiedGroupsChange(groups) {
  if (!state.canEdit) return;

  const cleanGroups = Array.isArray(groups)
    ? [...new Set(groups)].sort()
    : [];

  state.thirdQualifiedGroupsOverride = cleanGroups;

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error(
      "Error guardando desempate de terceros:",
      error
    );

    alert(
      "No se pudo guardar la selección manual de terceros."
    );
  }
}

async function handleReset() {
  if (!RESET_ENABLED) {
    console.warn("Reset desactivado.");
    return;
  }

  if (!state.canEdit) return;

  if (!confirm("¿Seguro que quieres resetear todos los resultados?")) return;

  state.matches = state.matches.map((m) => ({
    ...m,
    homeGoals: null,
    awayGoals: null,
  }));

  state.knockoutResults = {};
  state.thirdAssignments = {};
  state.thirdQualifiedGroupsOverride = [];

  renderApp();

  try {
    await saveRemoteState(state);
  } catch (error) {
    console.error("Error reseteando:", error);
    alert("No se pudo resetear.");
  }

  if (!isResetAllowed()) {
    alert("El reset está desactivado desde el inicio del Mundial.");
    return;
  }
}

function attachStaticHandlers() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.currentView = tab.dataset.view;

      localStorage.setItem(
        "porra-current-view",
        state.currentView
      );

      renderApp();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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
  state.knockoutResults = {};
  state.thirdAssignments = {};
  state.thirdQualifiedGroupsOverride = [];

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
    state.thirdQualifiedGroupsOverride =
      remote?.thirdQualifiedGroupsOverride || [];
    state.knockoutResults = remote?.knockoutResults || {};
    state.thirdAssignments = remote?.thirdAssignments || {};

    if (remote?.matches) {
      state.matches = mergeRemoteMatches(baseMatches, remote.matches);
    } else {
      state.matches = baseMatches;
      await saveRemoteState(state);
    }

    state.hasAccess = true;
    state.canEdit = true;

    unsubscribeRemote = subscribeRemoteState((remoteData) => {
      state.thirdQualifiedGroupsOverride =  remoteData?.thirdQualifiedGroupsOverride || [];
      state.knockoutResults = remoteData?.knockoutResults || {};
      state.thirdAssignments = remoteData?.thirdAssignments || {};
      
      const freshBaseMatches = buildMatchesFromConfig(state.groups, state.schedule);
      state.matches = mergeRemoteMatches(freshBaseMatches, remoteData?.matches || []);
      if (isEditingGroupScore()) {
        renderScoreboard(state);
        scheduleRenderAfterScoreEditing();
        return;
      }

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