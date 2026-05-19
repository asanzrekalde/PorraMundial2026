let chartInstance = null;


function getTeamById(id) {
  return TEAMS_BASE.find(t => t.id === id);
}

function getOwnedTeams(owner) {
  const ids = Object.values(GROUPS).flat();

  return ids
    .map(id => getTeamById(id))
    .filter(team => team && team.owner === owner);
}

function calculatePoints() {
  const points = { ANE: 0, AITOR: 0 };

  state.matches.forEach(match => {
    if (match.homeGoals == null || match.awayGoals == null) return;

    const home = getTeamById(match.home);
    const away = getTeamById(match.away);
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

function calculateTeamPoints(teamId) {
  let points = 0;

  state.matches.forEach(match => {
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

function renderScoreboard() {
  const points = calculatePoints();
  const played = state.matches.filter(
    m => m.homeGoals != null && m.awayGoals != null
  ).length;

  document.getElementById("score-ane").textContent = points.ANE;
  document.getElementById("score-aitor").textContent = points.AITOR;
  document.getElementById("played-count").textContent = played;
}

/* ---------------- HOME ---------------- */

function renderHome() {
  const container = document.createElement("div");
  container.className = "card";

  container.innerHTML = `
    <h2>Resumen General</h2>
    <div class="chart-container">
      <canvas id="pointsChart"></canvas>
    </div>
  `;

  setTimeout(renderPointsChart, 0);
  return container;
}

function renderPointsChart() {
  const ctx = document.getElementById("pointsChart");
  if (!ctx) return;

  const points = calculatePoints();

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["ANE", "AITOR"],
      datasets: [{
        label: "Puntos",
        data: [points.ANE, points.AITOR]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/* ---------------- MATCH LIST ---------------- */

function renderMatches(filterOwner = null, editable = true) {
  const container = document.createElement("div");
  container.className = "card";

  const sortedMatches = [...state.matches].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  sortedMatches.forEach(match => {
    const home = getTeamById(match.home);
    const away = getTeamById(match.away);

    if (!home || !away) {
      console.warn("Partido con equipo no encontrado:", match);
      return;
    }

    if (filterOwner) {
      if (home.owner !== filterOwner && away.owner !== filterOwner) return;
    }

    const row = document.createElement("div");
    row.className = "match-row";

    const formattedDate = match.date
      ? new Date(match.date).toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Sin fecha";

    if (editable) {
      row.innerHTML = `
        <span class="match-date">${formattedDate}</span>
        <span>${home.name}</span>
        <input type="number" min="0" value="${match.homeGoals ?? ""}">
        <span>-</span>
        <input type="number" min="0" value="${match.awayGoals ?? ""}">
        <span>${away.name}</span>
      `;

      const inputs = row.querySelectorAll("input");

      inputs[0].addEventListener("input", e => {
        match.homeGoals = e.target.value === "" ? null : Number(e.target.value);
        saveState();
        render();
      });

      inputs[1].addEventListener("input", e => {
        match.awayGoals = e.target.value === "" ? null : Number(e.target.value);
        saveState();
        render();
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

  return container;
}

/* ---------------- GROUPS ---------------- */

function renderGroups() {
  const container = document.createElement("div");
  container.className = "card";

  Object.entries(GROUPS).forEach(([groupName, teamIds]) => {
    const groupDiv = document.createElement("div");
    groupDiv.innerHTML = `<h3>Grupo ${groupName}</h3>`;

    const table = document.createElement("table");

    teamIds.forEach(id => {
      const team = getTeamById(id);
      if (!team) return;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${team.name}</td>
        <td>${team.owner ?? "-"}</td>
      `;
      table.appendChild(row);
    });

    groupDiv.appendChild(table);
    container.appendChild(groupDiv);
  });

  return container;
}


function renderOwnerView(owner) {
  const container = document.createElement("div");
  container.className = "card";

  const teams = getOwnedTeams(owner).sort((a, b) => a.name.localeCompare(b.name));

  let totalPoints = 0;

  const title = document.createElement("h2");
  title.textContent = owner;
  container.appendChild(title);

  const info = document.createElement("p");
  info.className = "muted";
  info.textContent = `${teams.length} equipos`;
  container.appendChild(info);

  const table = document.createElement("table");
  table.className = "table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Equipo</th>
      <th>Puntos</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  teams.forEach(team => {
    const pts = calculateTeamPoints(team.id);
    totalPoints += pts;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${team.name}</td>
      <td>${pts}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const totalDiv = document.createElement("h3");
  totalDiv.textContent = `Total: ${totalPoints} pts`;
  container.appendChild(totalDiv);

  const matchesTitle = document.createElement("h3");
  matchesTitle.textContent = "Partidos";
  container.appendChild(matchesTitle);

  container.appendChild(renderMatches(owner, false));

  return container;
}

/* ---------------- MAIN RENDER ---------------- */

function render() {
  renderScoreboard();

  const view = document.getElementById("view");
  view.innerHTML = "";

  let content;

  switch (state.currentView) {
    case "home":
      content = renderHome();
      break;
    case "matches":
      content = renderMatches();
      break;
    case "ane":
      content = renderOwnerView("ANE");
      break;
    case "aitor":
      content = renderOwnerView("AITOR");
      break;
    case "groups":
      content = renderGroups();
      break;
  }

  view.appendChild(content);
}


