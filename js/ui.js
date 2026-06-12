import {
  KNOCKOUT_PHASES,
  KNOCKOUT_TEMPLATE,
} from "./knockout.js";

import {
  getThirdPlaceAssignment,
  THIRD_PLACE_WINNER_SLOTS,
} from "./third-place-map.js";

const VALID_KNOCKOUT_PHASES = new Set([
  "round32",
  "round16",
  "quarterfinals",
  "semifinals",
  "finals",
]);

let activeKnockoutPhase =
  localStorage.getItem("porra-knockout-phase") ||
  "round32";

if (!VALID_KNOCKOUT_PHASES.has(activeKnockoutPhase)) {
  activeKnockoutPhase = "round32";
}

let chartInstance = null;

function getTeamById(state, id) {
  return state.teams.find((t) => t.id === id);
}

function getSortedGroupEntries(groups) {
  return Object.entries(groups).sort(([groupA], [groupB]) =>
    groupA.localeCompare(groupB, "es", { numeric: true })
  );
}

function renderFlag(team) {
  if (!team?.flagCode) {
    return `<span class="team-flag-placeholder" aria-hidden="true"></span>`;
  }

  return `
    <img
      class="team-flag"
      src="https://flagcdn.com/16x12/${team.flagCode}.png"
      srcset="https://flagcdn.com/32x24/${team.flagCode}.png 2x"
      width="16"
      height="12"
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
  `;
}

function renderTeamLabel(team) {
  return `
    <span class="team-label">
      ${renderFlag(team)}
      <span>${team.name}</span>
    </span>
  `;
}

function getOwnedTeams(state, owner) {
  const ids = Object.values(state.groups).flat();
  const seen = new Set();

  return ids
    .map((id) => getTeamById(state, id))
    .filter((team) => {
      if (!team) return false;
      if (team.owner !== owner) return false;
      if (seen.has(team.id)) return false;
      seen.add(team.id);
      return true;
    });
}

function formatDate(dateString) {
  if (!dateString) return "Sin fecha";

  // Si la fecha no trae zona horaria, asumimos Eastern Time del calendario FIFA.
  // En junio 2026, Eastern Time = UTC-4.
  const hasTimeZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(dateString);
  const normalizedDate = hasTimeZone ? dateString : `${dateString}-04:00`;

  return new Date(normalizedDate).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    if (!a.date && !b.date) return a.id.localeCompare(b.id);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });
}

function isGroupMatch(match) {
  return !match.phase || match.phase === "groups";
}

function isKnockoutMatch(match) {
  return match.phase && match.phase !== "groups";
}

function getMatchPointsForTeam(match, teamId) {
  if (match.homeGoals == null || match.awayGoals == null) return 0;

  const isHome = match.home === teamId;
  const isAway = match.away === teamId;

  if (!isHome && !isAway) return 0;

  // Fase de grupos: victoria 3, empate 1, derrota 0
  if (isGroupMatch(match)) {
    const goalsFor = isHome ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;

    if (goalsFor > goalsAgainst) return 3;
    if (goalsFor === goalsAgainst) return 1;
    return 0;
  }

  // KO futuro: el que pasa suma 3.
  // Si winnerTeamId existe, manda winnerTeamId.
  if (isKnockoutMatch(match)) {
    if (match.winnerTeamId) {
      return match.winnerTeamId === teamId ? 3 : 0;
    }

    // Si no hay winnerTeamId pero el marcador no está empatado,
    // deducimos ganador por goles.
    const goalsFor = isHome ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;

    if (goalsFor > goalsAgainst) return 3;
    return 0;
  }

  return 0;
}

function addPointsToTeam(pointsByTeam, teamId, points) {
  if (!teamId || !points) return;

  pointsByTeam.set(
    teamId,
    (pointsByTeam.get(teamId) || 0) + points
  );
}

function buildTeamPointsMap(state) {
  const pointsByTeam = new Map(
    state.teams.map((team) => [team.id, 0])
  );

  /*
   * Fase de grupos:
   * recorremos todos los partidos una sola vez.
   */
  state.matches
    .filter(isGroupMatch)
    .forEach((match) => {
      if (
        match.homeGoals == null ||
        match.awayGoals == null
      ) {
        return;
      }

      if (match.homeGoals > match.awayGoals) {
        addPointsToTeam(pointsByTeam, match.home, 3);
        return;
      }

      if (match.awayGoals > match.homeGoals) {
        addPointsToTeam(pointsByTeam, match.away, 3);
        return;
      }

      addPointsToTeam(pointsByTeam, match.home, 1);
      addPointsToTeam(pointsByTeam, match.away, 1);
    });

  /*
   * Si todavía no hay resultados KO,
   * evitamos calcular todo el cuadro.
   */
  const hasKnockoutResults = Object.values(
    state.knockoutResults || {}
  ).some(
    (result) =>
      result?.homeGoals != null ||
      result?.awayGoals != null ||
      result?.winnerTeamId != null
  );

  if (!hasKnockoutResults) {
    return pointsByTeam;
  }

  /*
   * Eliminatorias:
   * calculamos la clasificación solo una vez
   * y recorremos cada partido KO una sola vez.
   */
  const standingsByGroup =
    calculateGroupStandings(state);

  KNOCKOUT_TEMPLATE.forEach((match) => {
    const winner = resolveKnockoutWinnerTeam(
      state,
      match.id,
      standingsByGroup
    );

    if (winner?.id) {
      addPointsToTeam(pointsByTeam, winner.id, 3);
    }
  });

  return pointsByTeam;
}

export function calculateTeamPoints(
  state,
  teamId,
  pointsByTeam = null
) {
  const map =
    pointsByTeam || buildTeamPointsMap(state);

  return map.get(teamId) || 0;
}

export function calculatePoints(state) {
  const totals = {
    ANE: 0,
    AITOR: 0,
  };

  const pointsByTeam =
    buildTeamPointsMap(state);

  state.teams.forEach((team) => {
    if (!team.owner) return;

    totals[team.owner] +=
      pointsByTeam.get(team.id) || 0;
  });

  return totals;
}

function createEmptyStanding(team) {
  return {
    team,
    pj: 0,
    g: 0,
    e: 0,
    p: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    pts: 0,
  };
}

function calculateGroupStandings(state) {
  const standingsByGroup = {};

  getSortedGroupEntries(state.groups).forEach(([groupName, teamIds]) => {
    standingsByGroup[groupName] = {};

    teamIds.forEach((teamId) => {
      const team = getTeamById(state, teamId);
      if (team) {
        standingsByGroup[groupName][teamId] = createEmptyStanding(team);
      }
    });
  });

  state.matches
    .filter(isGroupMatch)
    .forEach((match) => {
      if (match.homeGoals == null || match.awayGoals == null) return;

      const group = match.group;
      if (!group || !standingsByGroup[group]) return;

      const homeStanding = standingsByGroup[group][match.home];
      const awayStanding = standingsByGroup[group][match.away];

      if (!homeStanding || !awayStanding) return;

      homeStanding.pj += 1;
      awayStanding.pj += 1;

      homeStanding.gf += match.homeGoals;
      homeStanding.gc += match.awayGoals;

      awayStanding.gf += match.awayGoals;
      awayStanding.gc += match.homeGoals;

      if (match.homeGoals > match.awayGoals) {
        homeStanding.g += 1;
        homeStanding.pts += 3;
        awayStanding.p += 1;
      } else if (match.homeGoals < match.awayGoals) {
        awayStanding.g += 1;
        awayStanding.pts += 3;
        homeStanding.p += 1;
      } else {
        homeStanding.e += 1;
        awayStanding.e += 1;
        homeStanding.pts += 1;
        awayStanding.pts += 1;
      }

      homeStanding.dg = homeStanding.gf - homeStanding.gc;
      awayStanding.dg = awayStanding.gf - awayStanding.gc;
    });

  const result = {};

  Object.entries(standingsByGroup).forEach(([groupName, standingsObj]) => {
    result[groupName] = Object.values(standingsObj).sort(compareStandings);
  });

  return result;
}

function isGroupFinished(state, groupName) {
  const groupMatches = state.matches.filter(
    (match) =>
      (!match.phase || match.phase === "groups") &&
      match.group === groupName
  );

  return (
    groupMatches.length === 6 &&
    groupMatches.every(
      (match) =>
        match.homeGoals != null &&
        match.awayGoals != null
    )
  );
}

function getKnockoutTemplateById(matchId) {
  return KNOCKOUT_TEMPLATE.find((match) => match.id === matchId);
}

function getStoredKnockoutResult(state, matchId) {
  return state.knockoutResults?.[matchId] || {};
}

function resolveKnockoutMatchTeams(state, matchId, standingsByGroup) {
  const match = getKnockoutTemplateById(matchId);

  if (!match) {
    return { homeTeam: null, awayTeam: null };
  }

  return {
    homeTeam: resolveKnockoutSourceTeam(
      state,
      match.homeSource,
      standingsByGroup
    ),
    awayTeam: resolveKnockoutSourceTeam(
      state,
      match.awaySource,
      standingsByGroup
    ),
  };
}

function resolveKnockoutWinnerTeam(state, matchId, standingsByGroup) {
  const { homeTeam, awayTeam } =
    resolveKnockoutMatchTeams(state, matchId, standingsByGroup);

  if (!homeTeam || !awayTeam) return null;

  const result = getStoredKnockoutResult(state, matchId);

  if (
    result.winnerTeamId === homeTeam.id ||
    result.winnerTeamId === awayTeam.id
  ) {
    return getTeamById(state, result.winnerTeamId);
  }

  if (
    result.homeGoals == null ||
    result.awayGoals == null
  ) {
    return null;
  }

  if (result.homeGoals > result.awayGoals) return homeTeam;
  if (result.awayGoals > result.homeGoals) return awayTeam;

  // Si empatan, necesitaremos indicar manualmente quién pasa
  // por prórroga o penaltis.
  return null;
}

function resolveKnockoutLoserTeam(state, matchId, standingsByGroup) {
  const { homeTeam, awayTeam } =
    resolveKnockoutMatchTeams(state, matchId, standingsByGroup);

  const winner =
    resolveKnockoutWinnerTeam(state, matchId, standingsByGroup);

  if (!homeTeam || !awayTeam || !winner) return null;

  return winner.id === homeTeam.id ? awayTeam : homeTeam;
}

function resolveKnockoutSourceTeam(state, source, standingsByGroup) {
  if (!source) return null;

  if (source.type === "group") {
    if (!isGroupFinished(state, source.group)) return null;

    return standingsByGroup[source.group]?.[
      source.position - 1
    ]?.team || null;
  }

  if (source.type === "third") {
    const { assignments } =
      getEffectiveThirdAssignments(state);

    const rawThirdGroup =
      assignments?.[source.winnerSlot];

    /*
    * Acepta tanto "E" como "3E".
    * El mapa debería devolver solo la letra,
    * pero así evitamos que un formato inesperado
    * impida resolver el cruce.
    */
    const thirdGroup =
      typeof rawThirdGroup === "string"
        ? rawThirdGroup
            .replace(/^3/i, "")
            .trim()
            .toUpperCase()
        : null;

    if (!thirdGroup) {
      console.warn(
        "No se encontró grupo para el tercero:",
        {
          winnerSlot: source.winnerSlot,
          assignments,
        }
      );

      return null;
    }

    if (!isGroupFinished(state, thirdGroup)) {
      console.warn(
        "El grupo asignado todavía no figura como finalizado:",
        thirdGroup
      );

      return null;
    }

    const thirdTeam =
      standingsByGroup?.[thirdGroup]?.[2]?.team;

    if (!thirdTeam) {
      console.warn(
        "No se encontró el tercer clasificado del grupo:",
        {
          thirdGroup,
          availableGroups:
            Object.keys(standingsByGroup || {}),
          standings:
            standingsByGroup?.[thirdGroup],
        }
      );

      return null;
    }

    return thirdTeam;
  }

  if (source.type === "winner") {
    return resolveKnockoutWinnerTeam(
      state,
      source.matchId,
      standingsByGroup
    );
  }

  if (source.type === "loser") {
    return resolveKnockoutLoserTeam(
      state,
      source.matchId,
      standingsByGroup
    );
  }

  return null;
}

function renderResolvedKnockoutTeam(
  state,
  source,
  standingsByGroup
) {
  const team = resolveKnockoutSourceTeam(
    state,
    source,
    standingsByGroup
  );

  if (team) {
    return renderTeamLabel(team);
  }

  return `
    <span class="muted">
      ${getKnockoutSourceLabel(source)}
    </span>
  `;
}

function renderManualThirdSelectionForm(state, thirds) {
  const savedGroups = new Set(
    state.thirdQualifiedGroupsOverride || []
  );

  /*
   * Como propuesta inicial marcamos:
   * - la selección guardada, si existe;
   * - o los ocho primeros según los datos disponibles.
   *
   * En caso de empate oficial, revisa manualmente
   * cuál debe entrar según tarjetas o ranking FIFA.
   */
  const defaultGroups =
    savedGroups.size > 0
      ? savedGroups
      : new Set(
          thirds
            .slice(0, 8)
            .map((third) => third.group)
        );

  const rows = thirds
    .map((third, index) => {
      const checked = defaultGroups.has(third.group)
        ? "checked"
        : "";

      return `
        <label class="third-override-row">
          <input
            type="checkbox"
            data-third-group="${third.group}"
            ${checked}
          />

          <span class="third-override-position">
            ${index + 1}.
          </span>

          <span class="third-override-team">
            ${renderTeamLabel(third.team)}
          </span>

          <span class="pill">
            Grupo ${third.group}
          </span>

          <span class="third-override-stats">
            ${third.pts} pts · DG ${third.dg} · GF ${third.gf}
          </span>
        </label>
      `;
    })
    .join("");

  return `
    <div
      class="third-override-form"
      data-third-override-form
    >
      <p>
        Selecciona exactamente los ocho terceros que
        pasan de ronda según el criterio oficial.
      </p>

      <div class="third-override-counter">
        Seleccionados:
        <strong data-third-selected-count>0</strong>
        / 8
      </div>

      <div class="third-override-list">
        ${rows}
      </div>

      <button
        class="btn primary"
        type="button"
        data-save-third-override
      >
        Guardar selección manual
      </button>
    </div>
  `;
}

function renderThirdPlaceResolutionStatus(state) {
  const {
    resolution,
    assignments,
    isComplete,
  } = getEffectiveThirdAssignments(state);

  if (isComplete) {
    const mode =
      resolution.status === "ready"
        ? "automáticamente"
        : "mediante desempate manual";

    return `
      <div class="third-map-status third-map-status-ready">
        <strong>
          Cruces de mejores terceros resueltos ${mode}
        </strong>

        <div class="third-map-pills">
          ${THIRD_PLACE_WINNER_SLOTS
            .map(
              (winnerSlot) => `
                <span class="pill">
                  ${winnerSlot} → 3.º ${assignments[winnerSlot]}
                </span>
              `
            )
            .join("")}
        </div>

        ${
          resolution.status === "manual"
            ? `
              <button
                class="btn"
                type="button"
                data-clear-third-override
              >
                Borrar desempate manual
              </button>
            `
            : ""
        }
      </div>
    `;
  }

  if (resolution.status === "pending") {
    return `
      <div class="third-map-status">
        <strong>
          Cruces con mejores terceros pendientes
        </strong>

        <p>
          Se rellenarán automáticamente cuando terminen
          los doce grupos.
        </p>
      </div>
    `;
  }

  if (
    resolution.status ===
    "needs-official-tiebreak"
  ) {
    return `
      <div class="third-map-status third-map-status-warning">
        <strong>
          Desempate oficial necesario
        </strong>

        <p>
          ${resolution.message}
        </p>

        ${renderManualThirdSelectionForm(
          state,
          resolution.thirds
        )}
      </div>
    `;
  }

  return `
    <div class="third-map-status third-map-status-error">
      <strong>
        No se pudieron resolver los mejores terceros
      </strong>

      <p>
        ${resolution.message ?? "Error desconocido"}
      </p>
    </div>
  `;
}

function wireThirdPlaceOverrideForm(
  container,
  onThirdQualifiedGroupsChange
) {
  const form = container.querySelector(
    "[data-third-override-form]"
  );

  const clearButton = container.querySelector(
    "[data-clear-third-override]"
  );

  clearButton?.addEventListener("click", () => {
    onThirdQualifiedGroupsChange([]);
  });

  if (!form) return;

  const checkboxes = [
    ...form.querySelectorAll(
      "input[data-third-group]"
    ),
  ];

  const counter = form.querySelector(
    "[data-third-selected-count]"
  );

  const updateCounter = () => {
    const selected = checkboxes.filter(
      (checkbox) => checkbox.checked
    );

    counter.textContent = selected.length;
  };

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener(
      "change",
      updateCounter
    );
  });

  updateCounter();

  form
    .querySelector("[data-save-third-override]")
    .addEventListener("click", () => {
      const selectedGroups = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map(
          (checkbox) =>
            checkbox.dataset.thirdGroup
        );

      if (selectedGroups.length !== 8) {
        alert(
          "Debes seleccionar exactamente ocho terceros."
        );

        return;
      }

      onThirdQualifiedGroupsChange(
        selectedGroups
      );
    });
}

function compareStandings(a, b) {
  // Simplificado:
  // 1) puntos
  // 2) diferencia de goles
  // 3) goles a favor
  // 4) nombre
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.team.name.localeCompare(b.team.name);
}

function calculateBestThirds(state) {
  const standingsByGroup = calculateGroupStandings(state);

  return Object.entries(standingsByGroup)
    .map(([groupName, standings]) => {
      const third = standings[2];
      if (!third) return null;

      return {
        ...third,
        group: groupName,
      };
    })
    .filter(Boolean)
    .sort(compareStandings);
}

function compareThirdStatsOnly(a, b) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.gf !== a.gf) return b.gf - a.gf;

  return 0;
}

function getManualThirdGroups(state, thirds) {
  const validThirdGroups = new Set(
    thirds.map((third) => third.group)
  );

  const groups = [
    ...new Set(
      state.thirdQualifiedGroupsOverride || []
    ),
  ]
    .filter((group) => validThirdGroups.has(group))
    .sort();

  return groups.length === 8
    ? groups
    : null;
}

function areAllGroupsFinished(state) {
  return Object.keys(state.groups).every((groupName) =>
    isGroupFinished(state, groupName)
  );
}

function getAutomaticThirdPlaceResolution(state) {
  const thirds = calculateBestThirds(state);

  if (!areAllGroupsFinished(state)) {
    return {
      status: "pending",
      thirds,
      assignments: null,
      qualifiedGroups: [],
    };
  }

  const eighth = thirds[7];
  const ninth = thirds[8];

  if (!eighth || !ninth) {
    return {
      status: "error",
      thirds,
      assignments: null,
      qualifiedGroups: [],
      message:
        "No se han podido calcular los doce terceros.",
    };
  }

  const requiresOfficialTiebreak =
    compareThirdStatsOnly(eighth, ninth) === 0;

  if (requiresOfficialTiebreak) {
    const manualGroups =
      getManualThirdGroups(state, thirds);

    if (!manualGroups) {
      return {
        status: "needs-official-tiebreak",
        thirds,
        assignments: null,
        qualifiedGroups: [],
        message:
          "Hay un empate en el corte entre el 8.º y el 9.º tercero. " +
          "Hace falta aplicar conducta deportiva o ranking FIFA.",
      };
    }

    const manualAssignments =
      getThirdPlaceAssignment(manualGroups);

    if (!manualAssignments) {
      return {
        status: "error",
        thirds,
        assignments: null,
        qualifiedGroups: manualGroups,
        message:
          "No se encontró la combinación manual en el mapa oficial.",
      };
    }

    return {
      status: "manual",
      thirds,
      assignments: manualAssignments,
      qualifiedGroups: manualGroups,
    };
  }

  const qualifiedGroups = thirds
    .slice(0, 8)
    .map((third) => third.group)
    .sort();

  const assignments =
    getThirdPlaceAssignment(qualifiedGroups);

  if (!assignments) {
    return {
      status: "error",
      thirds,
      assignments: null,
      qualifiedGroups,
      message:
        "No se encontró la combinación en el mapa oficial.",
    };
  }

  return {
    status: "ready",
    thirds,
    assignments,
    qualifiedGroups,
  };
}

function getEffectiveThirdAssignments(state) {
  const resolution =
    getAutomaticThirdPlaceResolution(state);

  /*
   * Dejamos preparada una vía manual de respaldo:
   * state.thirdAssignments puede sobrescribir asignaciones automáticas.
   *
   * Formato:
   * {
   *   "1A": "E",
   *   "1B": "J",
   *   ...
   * }
   */
  const assignments = {
    ...(resolution.assignments || {}),
    ...(state.thirdAssignments || {}),
  };

  const isComplete =
    THIRD_PLACE_WINNER_SLOTS.every(
      (winnerSlot) => assignments[winnerSlot]
    );

  return {
    resolution,
    assignments,
    isComplete,
  };
}

export function renderScoreboard(state) {
  const points = calculatePoints(state);
  const played = state.matches.filter(
    (m) => m.homeGoals != null && m.awayGoals != null
  ).length;

  document.getElementById("score-ane").textContent = points.ANE;
  document.getElementById("score-aitor").textContent = points.AITOR;
  document.getElementById("played-count").textContent = played;
}

function renderHome(state) {
  const container = document.createElement("div");
  container.className = "card";

  container.innerHTML = `
    <h2>Resumen general</h2>
    <div class="chart-wrap">
      <canvas id="points-chart"></canvas>
    </div>
  `;

  setTimeout(() => renderPointsChart(state), 0);
  return container;
}

function renderPointsChart(state) {
  const ctx = document.getElementById("points-chart");
  if (!ctx || !window.Chart) return;

  const points = calculatePoints(state);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: ["ANE", "AITOR"],
      datasets: [
        {
          label: "Puntos",
          data: [points.ANE, points.AITOR],
          backgroundColor: ["#bbf7d0", "#ddd6fe"],
          borderColor: ["#86efac", "#c4b5fd"],
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

function renderMatches(state, onMatchChange, filterOwner = null, editable = true) {
  const container = document.createElement("div");
  container.className = "card";

  const matches = sortMatches(state.matches);

  matches.forEach((match) => {
    const home = getTeamById(state, match.home);
    const away = getTeamById(state, match.away);

    if (!home || !away) return;

    if (filterOwner) {
      if (home.owner !== filterOwner && away.owner !== filterOwner) return;
    }

    const row = document.createElement("div");
    row.className = "match-row";

    const formattedDate = formatDate(match.date);

    if (editable && state.canEdit) {
      row.innerHTML = `
        <span class="match-date">${formattedDate}</span>

        <span class="match-team match-team-home">
          ${renderTeamLabel(home)}
        </span>

        <input
          class="group-score-input"
          type="number"
          min="0"
          max="99"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          value="${match.homeGoals ?? ""}"
        >

        <span>-</span>

        <input
          class="group-score-input"
          type="number"
          min="0"
          max="99"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          value="${match.awayGoals ?? ""}"
        >

        <span class="match-team match-team-away">
          ${renderTeamLabel(away)}
        </span>
      `;

      const inputs = row.querySelectorAll("input");

      const pushResult = () => {
      const newHomeGoals =
        inputs[0].value === ""
          ? null
          : Number(inputs[0].value);

      const newAwayGoals =
        inputs[1].value === ""
          ? null
          : Number(inputs[1].value);

      onMatchChange(
        match.id,
        newHomeGoals,
        newAwayGoals
      );
    };

    inputs.forEach((input) => {
  /*
   * Guarda al abandonar el campo:
   * - al pulsar Tab;
   * - al pulsar Enter;
   * - o al hacer clic fuera.
   *
   * Así no recalculamos la app con cada pulsación.
   */
  input.addEventListener("change", pushResult);

  /*
   * Al entrar en un input, selecciona el valor anterior.
   * Puedes sobrescribirlo directamente escribiendo un número.
   */
  input.addEventListener("focus", () => {
    input.select();
  });

  /*
   * Enter funciona como Tab:
   * guarda y avanza al siguiente marcador.
   */
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    pushResult();

    const allInputs = [
      ...document.querySelectorAll(".group-score-input"),
    ];

    const currentIndex = allInputs.indexOf(input);

    allInputs[currentIndex + 1]?.focus();
  });
});
    
    } else {
      row.innerHTML = `
        <span class="match-date">${formattedDate}</span>

        <span class="match-team match-team-home">
          ${renderTeamLabel(home)}
        </span>

        <span class="score-readonly">${match.homeGoals ?? "-"}</span>

        <span>-</span>

        <span class="score-readonly">${match.awayGoals ?? "-"}</span>

        <span class="match-team match-team-away">
          ${renderTeamLabel(away)}
        </span>
      `;
    }

    container.appendChild(row);
  });

  if (!container.children.length) {
    container.innerHTML = `<p class="muted">No hay partidos para mostrar.</p>`;
  }

  return container;
}

function renderGroupsQuickView(state) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";

  const groupsHtml = getSortedGroupEntries(state.groups)
    .map(([groupName, teamIds]) => {
      const items = teamIds
        .map((id) => getTeamById(state, id))
        .filter(Boolean)
        .map((team) => {
          const ownerClass =
            team.owner === "ANE"
              ? "owner-ane"
              : team.owner === "AITOR"
              ? "owner-aitor"
              : "owner-tbd";

          return `
            <li>
              ${renderTeamLabel(team)}
              <span class="pill ${ownerClass}">${team.owner ?? "TBD"}</span>
            </li>
          `;
        })
        .join("");

      return `
        <div class="group quick-group">
          <h3>Grupo ${groupName}</h3>
          <ul>${items}</ul>
        </div>
      `;
    })
    .join("");

  wrapper.innerHTML = `
    <h2>Vista rápida de grupos</h2>
    <p class="muted">Resumen compacto de equipos y dueño de cada selección.</p>
    <div class="grid">
      ${groupsHtml}
    </div>
  `;

  return wrapper;
}

function renderGroups(state) {
  const container = document.createElement("div");

  const standingsByGroup = calculateGroupStandings(state);
  const bestThirds = calculateBestThirds(state);

  // 1) Vista rápida compacta
  container.appendChild(renderGroupsQuickView(state));

  // 2) Clasificación por grupos
  const intro = document.createElement("div");
  intro.className = "card";
  intro.innerHTML = `
    <h2>Clasificación automática por grupos</h2>
    <p class="muted">
      Orden provisional: puntos, diferencia de goles, goles a favor y nombre.
      Los dos primeros aparecen en verde. El tercero aparece en amarillo.
    </p>
  `;
  container.appendChild(intro);

  getSortedGroupEntries(standingsByGroup).forEach(([groupName, standings]) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h2>Grupo ${groupName}</h2>
      ${renderStandingsTable(standings, { mode: "group" })}
    `;

    container.appendChild(card);
  });

  // 3) Mejores terceros debajo
  const bestThirdsCard = document.createElement("div");
  bestThirdsCard.className = "card";
  bestThirdsCard.innerHTML = `
    <h2>Mejores terceros</h2>
    <p class="muted">
      Los 8 primeros de esta tabla serían los terceros clasificados para dieciseisavos.
    </p>
    ${renderStandingsTable(bestThirds, { showGroup: true, mode: "thirds" })}
  `;

  container.appendChild(bestThirdsCard);

  return container;
}

function renderOwnerView(state, owner, onMatchChange) {
  const container = document.createElement("div");

  const pointsByTeam =
    buildTeamPointsMap(state);

  const getPoints = (team) =>
    pointsByTeam.get(team.id) || 0;

  const teams = getOwnedTeams(state, owner)
    .sort((a, b) => {
      const diff =
        getPoints(b) - getPoints(a);

      return (
        diff ||
        a.name.localeCompare(b.name, "es")
      );
    });

  let totalPoints = 0;

  const summary = document.createElement("div");
  summary.className = "card";

  const tableRows = teams
    .map((team) => {
      const pts = getPoints(team);
      totalPoints += pts;
      return `
        <tr>
          <td>${renderTeamLabel(team)}</td>
          <td>${team.group ?? "-"}</td>
          <td>${pts}</td>
        </tr>
      `;
    })
    .join("");

  summary.innerHTML = `
    <h2>${owner}</h2>
    <p class="muted">${teams.length} equipos</p>

    <table class="table">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Grupo</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <h3>Total: ${totalPoints} pts</h3>
  `;

  container.appendChild(summary);

  const matchesTitle = document.createElement("div");
  matchesTitle.className = "card";
  matchesTitle.innerHTML = `<h2>Partidos</h2>`;
  container.appendChild(matchesTitle);

  container.appendChild(renderMatches(state, onMatchChange, owner, false));

  return container;
}

function getKnockoutSourceLabel(source) {
  if (source.type === "group") {
    return `${source.position}º Grupo ${source.group}`;
  }

  if (source.type === "third") {
    return `3º ${source.candidates.join("/")}`;
  }

  if (source.type === "winner") {
    return `Ganador ${source.matchId.replace("KO-", "")}`;
  }

  if (source.type === "loser") {
    return `Perdedor ${source.matchId.replace("KO-", "")}`;
  }

  return "Pendiente";
}

function getKnockoutEditorData(
  state,
  match,
  standingsByGroup
) {
  const { homeTeam, awayTeam } =
    resolveKnockoutMatchTeams(
      state,
      match.id,
      standingsByGroup
    );

  const result =
    getStoredKnockoutResult(state, match.id);

  return {
    homeTeam,
    awayTeam,
    result,
  };
}

function renderKnockoutEditor(
  state,
  match,
  standingsByGroup
) {
  const {
    homeTeam,
    awayTeam,
    result,
  } = getKnockoutEditorData(
    state,
    match,
    standingsByGroup
  );

  if (!homeTeam || !awayTeam) {
    return `
      <div class="knockout-editor knockout-editor-pending">
        <div>
          ${renderResolvedKnockoutTeam(
            state,
            match.homeSource,
            standingsByGroup
          )}
        </div>

        <span class="knockout-versus">vs</span>

        <div>
          ${renderResolvedKnockoutTeam(
            state,
            match.awaySource,
            standingsByGroup
          )}
        </div>
      </div>
    `;
  }

  const homeGoals = result.homeGoals ?? "";
  const awayGoals = result.awayGoals ?? "";

  const hasCompleteScore =
    result.homeGoals != null &&
    result.awayGoals != null;

  const isTie =
    hasCompleteScore &&
    result.homeGoals === result.awayGoals;

  const selectedWinner =
    result.winnerTeamId ?? "";

  return `
    <div
      class="knockout-editor"
      data-ko-match-id="${match.id}"
      data-home-team-id="${homeTeam.id}"
      data-away-team-id="${awayTeam.id}"
    >
      <div class="knockout-editor-team knockout-editor-home">
        ${renderTeamLabel(homeTeam)}
      </div>

      <input
        class="knockout-goals knockout-home-goals"
        type="number"
        min="0"
        inputmode="numeric"
        value="${homeGoals}"
        aria-label="Goles ${homeTeam.name}"
      />

      <span class="knockout-score-separator">-</span>

      <input
        class="knockout-goals knockout-away-goals"
        type="number"
        min="0"
        inputmode="numeric"
        value="${awayGoals}"
        aria-label="Goles ${awayTeam.name}"
      />

      <div class="knockout-editor-team knockout-editor-away">
        ${renderTeamLabel(awayTeam)}
      </div>

      ${
        isTie
          ? `
            <label class="knockout-winner-box">
              <span>Clasificado:</span>

              <select class="knockout-winner-select">
                <option value="">
                  Selecciona quién pasa
                </option>

                <option
                  value="${homeTeam.id}"
                  ${
                    selectedWinner === homeTeam.id
                      ? "selected"
                      : ""
                  }
                >
                  ${homeTeam.name}
                </option>

                <option
                  value="${awayTeam.id}"
                  ${
                    selectedWinner === awayTeam.id
                      ? "selected"
                      : ""
                  }
                >
                  ${awayTeam.name}
                </option>
              </select>
            </label>
          `
          : ""
      }
    </div>
  `;
}

function wireKnockoutEditors(
  container,
  onKnockoutChange
) {
  container
    .querySelectorAll("[data-ko-match-id]")
    .forEach((row) => {
      const homeInput =
        row.querySelector(".knockout-home-goals");

      const awayInput =
        row.querySelector(".knockout-away-goals");

      const winnerSelect =
        row.querySelector(".knockout-winner-select");

      const pushResult = () => {
        const homeGoals =
          homeInput.value === ""
            ? null
            : Number(homeInput.value);

        const awayGoals =
          awayInput.value === ""
            ? null
            : Number(awayInput.value);

        let winnerTeamId = null;

        if (
          Number.isInteger(homeGoals) &&
          Number.isInteger(awayGoals)
        ) {
          if (homeGoals > awayGoals) {
            winnerTeamId =
              row.dataset.homeTeamId;
          } else if (awayGoals > homeGoals) {
            winnerTeamId =
              row.dataset.awayTeamId;
          } else {
            winnerTeamId =
              winnerSelect?.value || null;
          }
        }

        onKnockoutChange(
          row.dataset.koMatchId,
          {
            homeGoals,
            awayGoals,
            winnerTeamId,
          }
        );
      };

      homeInput.addEventListener("change", pushResult);
      awayInput.addEventListener("change", pushResult);

      winnerSelect?.addEventListener(
        "change",
        pushResult
      );
    });
}

function renderKnockoutMatch(
  state,
  match,
  standingsByGroup
) {
  return `
    <div class="knockout-match">
      <div class="knockout-match-number">
        ${match.title ?? `Partido ${match.number}`}
      </div>

      ${renderKnockoutEditor(
        state,
        match,
        standingsByGroup
      )}
    </div>
  `;
}

const BRACKET_CARD_WIDTH = 220;
const BRACKET_CARD_HEIGHT = 62;
const BRACKET_COLUMN_GAP = 64;
const BRACKET_ROW_GAP = 78;
const BRACKET_HEADER_HEIGHT = 48;

function getMainBracketRounds() {
  return [
    {
      id: "round32",
      label: "Dieciseisavos",
      matches: KNOCKOUT_TEMPLATE.filter((m) => m.phase === "round32"),
    },
    {
      id: "round16",
      label: "Octavos",
      matches: KNOCKOUT_TEMPLATE.filter((m) => m.phase === "round16"),
    },
    {
      id: "quarterfinals",
      label: "Cuartos",
      matches: KNOCKOUT_TEMPLATE.filter((m) => m.phase === "quarterfinals"),
    },
    {
      id: "semifinals",
      label: "Semifinales",
      matches: KNOCKOUT_TEMPLATE.filter((m) => m.phase === "semifinals"),
    },
    {
      id: "final",
      label: "Final",
      matches: KNOCKOUT_TEMPLATE.filter((m) => m.id === "KO-104"),
    },
  ];
}

function getPreviousMatchIds(match) {
  return [match.homeSource, match.awaySource]
    .filter((source) =>
      source &&
      (source.type === "winner" || source.type === "loser")
    )
    .map((source) => source.matchId);
}

function calculateBracketLayout() {
  const rounds = getMainBracketRounds();
  const positions = {};

  // Dieciseisavos: posiciones regulares de arriba abajo
  rounds[0].matches.forEach((match, index) => {
    positions[match.id] = {
      x: 0,
      y: BRACKET_HEADER_HEIGHT + index * BRACKET_ROW_GAP,
    };
  });

  // Rondas posteriores: cada partido se centra entre sus dos precedentes
  rounds.slice(1).forEach((round, roundIndex) => {
    const x =
      (roundIndex + 1) *
      (BRACKET_CARD_WIDTH + BRACKET_COLUMN_GAP);

    round.matches.forEach((match, index) => {
      const previousIds = getPreviousMatchIds(match);
      const previousPositions = previousIds
        .map((id) => positions[id])
        .filter(Boolean);

      const fallbackY =
        BRACKET_HEADER_HEIGHT +
        index * BRACKET_ROW_GAP * Math.pow(2, roundIndex + 1);

      const y =
        previousPositions.length > 0
          ? previousPositions.reduce(
              (acc, position) => acc + position.y,
              0
            ) / previousPositions.length
          : fallbackY;

      positions[match.id] = { x, y };
    });
  });

  const width =
    rounds.length * BRACKET_CARD_WIDTH +
    (rounds.length - 1) * BRACKET_COLUMN_GAP;

  const height =
    Math.max(
      ...Object.values(positions).map(
        (position) => position.y + BRACKET_CARD_HEIGHT
      )
    ) + 16;

  return { rounds, positions, width, height };
}

function renderBracketConnectors(layout) {
  const paths = [];

  layout.rounds.slice(1).forEach((round) => {
    round.matches.forEach((targetMatch) => {
      const target = layout.positions[targetMatch.id];
      if (!target) return;

      getPreviousMatchIds(targetMatch).forEach((previousId) => {
        const source = layout.positions[previousId];
        if (!source) return;

        const x1 = source.x + BRACKET_CARD_WIDTH;
        const y1 = source.y + BRACKET_CARD_HEIGHT / 2;

        const x2 = target.x;
        const y2 = target.y + BRACKET_CARD_HEIGHT / 2;

        const middleX = x1 + (x2 - x1) / 2;

        paths.push(`
          <path
            d="M ${x1} ${y1}
               H ${middleX}
               V ${y2}
               H ${x2}"
          />
        `);
      });
    });
  });

  return `
    <svg
      class="full-bracket-connectors"
      width="${layout.width}"
      height="${layout.height}"
      viewBox="0 0 ${layout.width} ${layout.height}"
      aria-hidden="true"
    >
      ${paths.join("")}
    </svg>
  `;
}

function renderFullBracketTeamLine(
  state,
  source,
  team,
  score,
  winnerTeamId
) {
  const winnerClass =
    team && team.id === winnerTeamId
      ? "winner"
      : "";

  return `
    <div class="full-bracket-team ${winnerClass}">
      <span>
        ${
          team
            ? renderTeamLabel(team)
            : `
              <span class="muted">
                ${getKnockoutSourceLabel(source)}
              </span>
            `
        }
      </span>

      <strong>${score ?? "-"}</strong>
    </div>
  `;
}

function renderFullBracketCard(
  state,
  match,
  position,
  standingsByGroup
) {
  const { homeTeam, awayTeam } =
    resolveKnockoutMatchTeams(
      state,
      match.id,
      standingsByGroup
    );

  const result =
    getStoredKnockoutResult(state, match.id);

  const winner =
    resolveKnockoutWinnerTeam(
      state,
      match.id,
      standingsByGroup
    );

  return `
    <article
      class="full-bracket-card"
      style="
        left: ${position.x}px;
        top: ${position.y}px;
        width: ${BRACKET_CARD_WIDTH}px;
        min-height: ${BRACKET_CARD_HEIGHT}px;
      "
    >
      <div class="full-bracket-card-title">
        ${match.title ?? `Partido ${match.number}`}
      </div>

      ${renderFullBracketTeamLine(
        state,
        match.homeSource,
        homeTeam,
        result.homeGoals,
        winner?.id
      )}

      ${renderFullBracketTeamLine(
        state,
        match.awaySource,
        awayTeam,
        result.awayGoals,
        winner?.id
      )}
    </article>
  `;
}

function renderFullBracket(state, standingsByGroup) {
  const layout = calculateBracketLayout();

  const headers = layout.rounds
    .map((round, index) => {
      const left =
        index * (BRACKET_CARD_WIDTH + BRACKET_COLUMN_GAP);

      return `
        <div
          class="full-bracket-header"
          style="
            left: ${left}px;
            width: ${BRACKET_CARD_WIDTH}px;
          "
        >
          ${round.label}
        </div>
      `;
    })
    .join("");

  const cards = layout.rounds
    .flatMap((round) => round.matches)
    .map((match) =>
      renderFullBracketCard(
        state,
        match,
        layout.positions[match.id],
        standingsByGroup
      )
    )
    .join("");

  const thirdPlaceMatch =
    KNOCKOUT_TEMPLATE.find((match) => match.id === "KO-103");

  return `
    <div class="card">
      <h2>Cuadro completo</h2>
      <p class="muted">
        Se rellenará automáticamente conforme terminen
        los grupos y las rondas eliminatorias.
      </p>

      <div class="full-bracket-scroll">
        <div
          class="full-bracket-board"
          style="
            width: ${layout.width}px;
            height: ${layout.height}px;
          "
        >
          ${renderBracketConnectors(layout)}
          ${headers}
          ${cards}
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Tercer puesto</h2>

      <div class="third-place-match">
        <span>
          ${renderResolvedKnockoutTeam(
            state,
            thirdPlaceMatch.homeSource,
            standingsByGroup
          )}
        </span>

        <strong>vs</strong>

        <span>
          ${renderResolvedKnockoutTeam(
            state,
            thirdPlaceMatch.awaySource,
            standingsByGroup
          )}
        </span>
      </div>
    </div>
  `;
}

function renderKnockout(state, onKnockoutChange, onThirdQualifiedGroupsChange) {
  const standingsByGroup =
  calculateGroupStandings(state);
  const container = document.createElement("div");

  container.innerHTML = `
    <div class="card">
      <h2>Eliminatorias</h2>
      <p class="muted">
        Los cruces se rellenan automáticamente conforme terminan los grupos y las rondas eliminatorias.
      </p>

      ${renderThirdPlaceResolutionStatus(state)}

      <div class="knockout-phase-tabs">
        ${KNOCKOUT_PHASES.map(
          (phase, index) => `
            <button
              class="knockout-phase-tab ${
                phase.id === activeKnockoutPhase
                  ? "active"
                  : ""
              }"
              data-phase="${phase.id}"
            >
              ${phase.label}
            </button>
          `
        ).join("")}
      </div>
    </div>

    ${KNOCKOUT_PHASES.map(
      (phase, index) => `
        <section
          class="card knockout-phase-panel"
          data-phase-panel="${phase.id}"
          ${
            phase.id === activeKnockoutPhase
              ? ""
              : "hidden"
          }
        >
          <h2>${phase.label}</h2>

          <div class="knockout-list">
            ${KNOCKOUT_TEMPLATE
              .filter((match) => match.phase === phase.id)
              .map((match) =>
                renderKnockoutMatch(
                  state,
                  match,
                  standingsByGroup
                )
              )
              .join("")}
          </div>
        </section>
      `
    ).join("")}

    ${renderFullBracket(state, standingsByGroup)}
  `;

  container.querySelectorAll(".knockout-phase-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedPhase = button.dataset.phase;

      activeKnockoutPhase = selectedPhase;

      localStorage.setItem(
        "porra-knockout-phase",
        activeKnockoutPhase
      );

      container.querySelectorAll(".knockout-phase-tab").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });

      container.querySelectorAll(".knockout-phase-panel").forEach((panel) => {
        panel.hidden = panel.dataset.phasePanel !== selectedPhase;
      });
    });
  });

  wireKnockoutEditors(
    container,
    onKnockoutChange
  );

  wireThirdPlaceOverrideForm(
    container,
    onThirdQualifiedGroupsChange
  );

  return container;
}

export function renderContent(state, onMatchChange, onKnockoutChange, onThirdQualifiedGroupsChange) {
  switch (state.currentView) {
    case "home":
      return renderHome(state);
    case "ane":
      return renderOwnerView(state, "ANE", onMatchChange);
    case "aitor":
      return renderOwnerView(state, "AITOR", onMatchChange);
    case "groups":
      return renderGroups(state);
    case "matches":
      return renderMatches(state, onMatchChange, null, true);
    case "knockout":
      return renderKnockout(state, onKnockoutChange, onThirdQualifiedGroupsChange);
    default:
      return renderHome(state);
  }
}

function renderStandingsTable(standings, options = {}) {
  const { showGroup = false, mode = "group" } = options;

  const rows = standings
    .map((s, index) => {
      const ownerClass =
        s.team.owner === "ANE"
          ? "owner-ane"
          : s.team.owner === "AITOR"
          ? "owner-aitor"
          : "owner-tbd";

      let positionClass = "";

      if (mode === "group") {
        if (index < 2) positionClass = "qualified";
        else if (index === 2) positionClass = "third-place";
      }

      if (mode === "thirds") {
        if (index < 8) positionClass = "qualified";
        else positionClass = "eliminated";
      }

      return `
        <tr class="${positionClass}">
          <td>${index + 1}</td>
          ${showGroup ? `<td>${s.group}</td>` : ""}
          <td class="team-cell">
            ${renderTeamLabel(s.team)}
            <span class="pill ${ownerClass}">${s.team.owner ?? "TBD"}</span>
          </td>
          <td>${s.pj}</td>
          <td>${s.g}</td>
          <td>${s.e}</td>
          <td>${s.p}</td>
          <td>${s.gf}</td>
          <td>${s.gc}</td>
          <td>${s.dg}</td>
          <td><strong>${s.pts}</strong></td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="table standings-table">
      <thead>
        <tr>
          <th>#</th>
          ${showGroup ? "<th>Grupo</th>" : ""}
          <th>Equipo</th>
          <th>PJ</th>
          <th>G</th>
          <th>E</th>
          <th>P</th>
          <th>GF</th>
          <th>GC</th>
          <th>DG</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}