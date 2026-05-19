const STORAGE_KEY = "porra-mundial-2026";

function createInitialState() {
  const matches = [];

  Object.entries(GROUPS).forEach(([groupName, teamIds]) => {
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const matchId = `${groupName}-${teamIds[i]}-${teamIds[j]}`;

        matches.push({
          id: matchId,
          group: groupName,
          home: teamIds[i],
          away: teamIds[j],
          date: MATCH_SCHEDULE[matchId] || null,
          homeGoals: null,
          awayGoals: null,
        });
      }
    }
  });

  return {
    matches,
    currentView: "home",
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return createInitialState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  saveState();
  render();
}

let state = loadState();