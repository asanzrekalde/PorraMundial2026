export const KNOCKOUT_PHASES = [
  { id: "round32", label: "Dieciseisavos" },
  { id: "round16", label: "Octavos" },
  { id: "quarterfinals", label: "Cuartos" },
  { id: "semifinals", label: "Semifinales" },
  { id: "finals", label: "Finales" },
];

export const KNOCKOUT_TEMPLATE = [
  // =========================
  // DIECISEISAVOS: 73 - 88
  // =========================
  {
    id: "KO-73",
    number: 73,
    phase: "round32",
    homeSource: { type: "group", position: 2, group: "A" },
    awaySource: { type: "group", position: 2, group: "B" },
  },
  {
    id: "KO-74",
    number: 74,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "E" },
    awaySource: { type: "third", candidates: ["A", "B", "C", "D", "F"] },
  },
  {
    id: "KO-75",
    number: 75,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "F" },
    awaySource: { type: "group", position: 2, group: "C" },
  },
  {
    id: "KO-76",
    number: 76,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "C" },
    awaySource: { type: "group", position: 2, group: "F" },
  },
  {
    id: "KO-77",
    number: 77,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "I" },
    awaySource: { type: "third", candidates: ["C", "D", "F", "G", "H"] },
  },
  {
    id: "KO-78",
    number: 78,
    phase: "round32",
    homeSource: { type: "group", position: 2, group: "E" },
    awaySource: { type: "group", position: 2, group: "I" },
  },
  {
    id: "KO-79",
    number: 79,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "A" },
    awaySource: { type: "third", candidates: ["C", "E", "F", "H", "I"] },
  },
  {
    id: "KO-80",
    number: 80,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "L" },
    awaySource: { type: "third", candidates: ["E", "H", "I", "J", "K"] },
  },
  {
    id: "KO-81",
    number: 81,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "D" },
    awaySource: { type: "third", candidates: ["B", "E", "F", "I", "J"] },
  },
  {
    id: "KO-82",
    number: 82,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "G" },
    awaySource: { type: "third", candidates: ["A", "E", "H", "I", "J"] },
  },
  {
    id: "KO-83",
    number: 83,
    phase: "round32",
    homeSource: { type: "group", position: 2, group: "K" },
    awaySource: { type: "group", position: 2, group: "L" },
  },
  {
    id: "KO-84",
    number: 84,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "H" },
    awaySource: { type: "group", position: 2, group: "J" },
  },
  {
    id: "KO-85",
    number: 85,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "B" },
    awaySource: { type: "third", candidates: ["E", "F", "G", "I", "J"] },
  },
  {
    id: "KO-86",
    number: 86,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "J" },
    awaySource: { type: "group", position: 2, group: "H" },
  },
  {
    id: "KO-87",
    number: 87,
    phase: "round32",
    homeSource: { type: "group", position: 1, group: "K" },
    awaySource: { type: "third", candidates: ["D", "E", "I", "J", "L"] },
  },
  {
    id: "KO-88",
    number: 88,
    phase: "round32",
    homeSource: { type: "group", position: 2, group: "D" },
    awaySource: { type: "group", position: 2, group: "G" },
  },

    // =========================
  // OCTAVOS: 89 - 96
  // =========================
  {
    id: "KO-89",
    number: 89,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-74" },
    awaySource: { type: "winner", matchId: "KO-77" },
  },
  {
    id: "KO-90",
    number: 90,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-73" },
    awaySource: { type: "winner", matchId: "KO-75" },
  },
  {
    id: "KO-91",
    number: 91,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-76" },
    awaySource: { type: "winner", matchId: "KO-78" },
  },
  {
    id: "KO-92",
    number: 92,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-79" },
    awaySource: { type: "winner", matchId: "KO-80" },
  },
  {
    id: "KO-93",
    number: 93,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-83" },
    awaySource: { type: "winner", matchId: "KO-84" },
  },
  {
    id: "KO-94",
    number: 94,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-81" },
    awaySource: { type: "winner", matchId: "KO-82" },
  },
  {
    id: "KO-95",
    number: 95,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-86" },
    awaySource: { type: "winner", matchId: "KO-88" },
  },
  {
    id: "KO-96",
    number: 96,
    phase: "round16",
    homeSource: { type: "winner", matchId: "KO-85" },
    awaySource: { type: "winner", matchId: "KO-87" },
  },

  // =========================
  // CUARTOS: 97 - 100
  // =========================
  {
    id: "KO-97",
    number: 97,
    phase: "quarterfinals",
    homeSource: { type: "winner", matchId: "KO-89" },
    awaySource: { type: "winner", matchId: "KO-90" },
  },
  {
    id: "KO-98",
    number: 98,
    phase: "quarterfinals",
    homeSource: { type: "winner", matchId: "KO-93" },
    awaySource: { type: "winner", matchId: "KO-94" },
  },
  {
    id: "KO-99",
    number: 99,
    phase: "quarterfinals",
    homeSource: { type: "winner", matchId: "KO-91" },
    awaySource: { type: "winner", matchId: "KO-92" },
  },
  {
    id: "KO-100",
    number: 100,
    phase: "quarterfinals",
    homeSource: { type: "winner", matchId: "KO-95" },
    awaySource: { type: "winner", matchId: "KO-96" },
  },

  // =========================
  // SEMIFINALES: 101 - 102
  // =========================
  {
    id: "KO-101",
    number: 101,
    phase: "semifinals",
    homeSource: { type: "winner", matchId: "KO-97" },
    awaySource: { type: "winner", matchId: "KO-98" },
  },
  {
    id: "KO-102",
    number: 102,
    phase: "semifinals",
    homeSource: { type: "winner", matchId: "KO-99" },
    awaySource: { type: "winner", matchId: "KO-100" },
  },

  // =========================
  // TERCER PUESTO Y FINAL
  // =========================
  {
    id: "KO-103",
    number: 103,
    phase: "finals",
    title: "Tercer puesto",
    homeSource: { type: "loser", matchId: "KO-101" },
    awaySource: { type: "loser", matchId: "KO-102" },
  },
  {
    id: "KO-104",
    number: 104,
    phase: "finals",
    title: "Final",
    homeSource: { type: "winner", matchId: "KO-101" },
    awaySource: { type: "winner", matchId: "KO-102" },
  },
];