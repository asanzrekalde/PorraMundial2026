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

export function calculateTeamPoints(state, teamId) {
  let points = 0;

  state.matches.forEach((match) => {
    if (match.homeGoals == null || match.awayGoals == null) return;

    if (match.home === teamId) {
      if (match.homeGoals > match.awayGoals) points += 3;
      else if (match.homeGoals === match.awayGoals) points += 1;
    }

    if (match.away === teamId) {
      if (match.awayGoals > match.homeGoals) points += 3;
      else if (match.awayGoals === match.homeGoals) points += 1;
    }
  });

  return points;
}

export function calculatePoints(state) {
  const points = { ANE: 0, AITOR: 0 };

  state.matches.forEach((match) => {
    if (match.homeGoals == null || match.awayGoals == null) return;

    const home = getTeamById(state, match.home);
    const away = getTeamById(state, match.away);
    if (!home || !away) return;

    if (match.homeGoals > match.awayGoals) {
      if (home.owner) points[home.owner] += 3;
    } else if (match.awayGoals > match.homeGoals) {
      if (away.owner) points[away.owner] += 3;
    } else {
      if (home.owner) points[home.owner] += 1;
      if (away.owner) points[away.owner] += 1;
    }
  });

  return points;
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
  container.className = "grid";

  Object.entries(state.groups).forEach(([groupName, teamIds]) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "group";

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
            ${team.name}
            <span class="pill ${ownerClass}">${team.owner ?? "TBD"}</span>
          </li>
        `;
      })
      .join("");

    groupDiv.innerHTML = `
      <h3>Grupo ${groupName}</h3>
      <ul>${items}</ul>
    `;

    container.appendChild(groupDiv);
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