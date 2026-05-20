let chartInstance = null;

function getTeamById(state, id) {
  return state.teams.find((t) => t.id === id);
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
  return new Date(dateString).toLocaleString("es-ES", {
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

export function calculateTeamPoints(state, teamId) {
  return state.matches.reduce((acc, match) => {
    return acc + getMatchPointsForTeam(match, teamId);
  }, 0);
}

export function calculatePoints(state) {
  const points = { ANE: 0, AITOR: 0 };

  state.matches.forEach((match) => {
    const home = getTeamById(state, match.home);
    const away = getTeamById(state, match.away);

    if (home?.owner) {
      points[home.owner] += getMatchPointsForTeam(match, home.id);
    }

    if (away?.owner) {
      points[away.owner] += getMatchPointsForTeam(match, away.id);
    }
  });

  return points;
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

  Object.entries(state.groups).forEach(([groupName, teamIds]) => {
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
        <span>${home.name}</span>
        <input type="number" min="0" value="${match.homeGoals ?? ""}">
        <span>-</span>
        <input type="number" min="0" value="${match.awayGoals ?? ""}">
        <span>${away.name}</span>
      `;

      const inputs = row.querySelectorAll("input");

      inputs[0].addEventListener("change", () => {
        const newHomeGoals =
          inputs[0].value === "" ? null : Number(inputs[0].value);
        const newAwayGoals =
          inputs[1].value === "" ? null : Number(inputs[1].value);

        onMatchChange(match.id, newHomeGoals, newAwayGoals);
      });

      inputs[1].addEventListener("change", () => {
        const newHomeGoals =
          inputs[0].value === "" ? null : Number(inputs[0].value);
        const newAwayGoals =
          inputs[1].value === "" ? null : Number(inputs[1].value);

        onMatchChange(match.id, newHomeGoals, newAwayGoals);
      });
    } else {
      row.innerHTML = `
        <span class="match-date">${formattedDate}</span>
        <span>${home.name}</span>
        <span class="score-readonly">${match.homeGoals ?? "-"}</span>
        <span>-</span>
        <span class="score-readonly">${match.awayGoals ?? "-"}</span>
        <span>${away.name}</span>
      `;
    }

    container.appendChild(row);
  });

  if (!container.children.length) {
    container.innerHTML = `<p class="muted">No hay partidos para mostrar.</p>`;
  }

  return container;
}

function renderGroups(state) {
  const container = document.createElement("div");

  const standingsByGroup = calculateGroupStandings(state);
  const bestThirds = calculateBestThirds(state);

  const intro = document.createElement("div");
  intro.className = "card";
  intro.innerHTML = `
    <h2>Clasificación de grupos</h2>
    <p class="muted">
      Orden provisional: puntos, diferencia de goles, goles a favor y nombre.
      Los dos primeros pasan directamente. Los 8 mejores terceros también pasan.
    </p>
  `;
  container.appendChild(intro);

  const bestThirdsCard = document.createElement("div");
  bestThirdsCard.className = "card";
  bestThirdsCard.innerHTML = `
    <h2>Mejores terceros</h2>
    <p class="muted">
      Los 8 primeros de esta tabla serían los mejores terceros clasificados.
    </p>
    ${renderStandingsTable(bestThirds, true)}
  `;
  container.appendChild(bestThirdsCard);

  Object.entries(standingsByGroup).forEach(([groupName, standings]) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h2>Grupo ${groupName}</h2>
      ${renderStandingsTable(standings)}
    `;

    container.appendChild(card);
  });

  return container;
}

function renderOwnerView(state, owner, onMatchChange) {
  const container = document.createElement("div");

  const teams = getOwnedTeams(state, owner).sort((a, b) => {
    const diff = calculateTeamPoints(state, b.id) - calculateTeamPoints(state, a.id);
    return diff || a.name.localeCompare(b.name);
  });

  let totalPoints = 0;

  const summary = document.createElement("div");
  summary.className = "card";

  const tableRows = teams
    .map((team) => {
      const pts = calculateTeamPoints(state, team.id);
      totalPoints += pts;
      return `
        <tr>
          <td>${team.name}</td>
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

export function renderContent(state, onMatchChange) {
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
    default:
      return renderHome(state);
  }
}

function renderStandingsTable(standings, showGroup = false) {
  const rows = standings
    .map((s, index) => {
      const ownerClass =
        s.team.owner === "ANE"
          ? "owner-ane"
          : s.team.owner === "AITOR"
          ? "owner-aitor"
          : "owner-tbd";

      const positionClass =
        index < 2
          ? "qualified"
          : index === 2
          ? "third-place"
          : "";

      return `
        <tr class="${positionClass}">
          <td>${index + 1}</td>
          ${showGroup ? `<td>${s.group}</td>` : ""}
          <td>
            ${s.team.name}
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