import { GROUPS, MATCH_SCHEDULE } from "./data.js";

export function createInitialState() {
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
    currentView: "home",
    matches,
  };
}

export function mergeRemoteMatches(baseMatches, remoteMatches = []) {
  const byId = new Map((remoteMatches || []).map((m) => [m.id, m]));

  return baseMatches.map((base) => {
    const remote = byId.get(base.id);
    if (!remote) return base;

    return {
      ...base,
      homeGoals:
        Number.isInteger(remote.homeGoals) && remote.homeGoals >= 0
          ? remote.homeGoals
          : null,
      awayGoals:
        Number.isInteger(remote.awayGoals) && remote.awayGoals >= 0
          ? remote.awayGoals
          : null,
    };
  });
}