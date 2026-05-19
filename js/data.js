const TEAMS_BASE = [
  { id: "mex", name: "México", owner: "ANE" },
  { id: "rsa", name: "Sudáfrica", owner: "ANE" },
  { id: "kor", name: "República de Corea", owner: "AITOR" },
  { id: "qa4", name: "República Checa", owner: "AITOR" },

  { id: "can", name: "Canadá", owner: "AITOR" },
  { id: "qb2", name: "Bosnia y Herzegovina", owner: "AITOR" },
  { id: "qat", name: "Catar", owner: "ANE" },
  { id: "sui", name: "Suiza", owner: "ANE" },

  { id: "bra", name: "Brasil", owner: "ANE" },
  { id: "mar", name: "Marruecos", owner: "AITOR" },
  { id: "hti", name: "Haití", owner: "AITOR" },
  { id: "sco", name: "Escocia", owner: "ANE" },

  { id: "usa", name: "EE. UU.", owner: "AITOR" },
  { id: "par", name: "Paraguay", owner: "ANE" },
  { id: "aus", name: "Australia", owner: "AITOR" },
  { id: "qd4", name: "Turquía", owner: "ANE" },

  { id: "ger", name: "Alemania", owner: "AITOR" },
  { id: "cuw", name: "Curazao", owner: "ANE" },
  { id: "civ", name: "Costa de Marfil", owner: "AITOR" },
  { id: "ecu", name: "Ecuador", owner: "ANE" },

  { id: "ned", name: "Países Bajos", owner: "ANE" },
  { id: "jpn", name: "Japón", owner: "AITOR" },
  { id: "qf3", name: "Suecia", owner: "ANE" },
  { id: "tun", name: "Túnez", owner: "ANE" },

  { id: "bel", name: "Bélgica", owner: "ANE" },
  { id: "egy", name: "Egipto", owner: "ANE" },
  { id: "irn", name: "Irán", owner: "AITOR" },
  { id: "nzl", name: "Nueva Zelanda", owner: "ANE" },

  { id: "esp", name: "España", owner: "ANE" },
  { id: "cpv", name: "Islas de Cabo Verde", owner: "AITOR" },
  { id: "ksa", name: "Arabia Saudí", owner: "AITOR" },
  { id: "uru", name: "Uruguay", owner: "AITOR" },

  { id: "fra", name: "Francia", owner: "AITOR" },
  { id: "sen", name: "Senegal", owner: "AITOR" },
  { id: "qi3", name: "Irak", owner: "ANE" },
  { id: "nor", name: "Noruega", owner: "AITOR" },

  { id: "arg", name: "Argentina", owner: "AITOR" },
  { id: "alg", name: "Argelia", owner: "AITOR" },
  { id: "aut", name: "Austria", owner: "ANE" },
  { id: "jor", name: "Jordania", owner: "ANE" },

  { id: "por", name: "Portugal", owner: "AITOR" },
  { id: "qk2", name: "Congo", owner: "AITOR" },
  { id: "uzb", name: "Uzbekistán", owner: "AITOR" },
  { id: "col", name: "Colombia", owner: "ANE" },

  { id: "eng", name: "Inglaterra", owner: "ANE" },
  { id: "cro", name: "Croacia", owner: "ANE" },
  { id: "gha", name: "Ghana", owner: "AITOR" },
  { id: "pan", name: "Panamá", owner: "ANE" },
];

const GROUPS = {
  A: ["mex","rsa","kor","qa4"],
  B: ["can","qb2","qat","sui"],
  C: ["bra","mar","hti","sco"],
  D: ["usa","par","aus","qd4"],
  E: ["ger","cuw","civ","ecu"],
  F: ["ned","jpn","qf3","tun"],
  G: ["bel","egy","irn","nzl"],
  H: ["esp","cpv","ksa","uru"],
  I: ["fra","sen","qi3","nor"],
  J: ["arg","alg","aut","jor"],
  K: ["por","qk2","uzb","col"],
  L: ["eng","cro","gha","pan"],
};

const MATCH_SCHEDULE = {
  // Grupo A
  "A-mex-rsa": "2026-06-11T15:00:00",
  "A-mex-kor": "2026-06-18T21:00:00",
  "A-mex-qa4": "2026-06-24T21:00:00",
  "A-rsa-kor": "2026-06-24T21:00:00",
  "A-rsa-qa4": "2026-06-18T12:00:00",
  "A-kor-qa4": "2026-06-11T22:00:00",

  // Grupo B
  "B-can-qb2": "2026-06-12T15:00:00",
  "B-can-qat": "2026-06-18T18:00:00",
  "B-can-sui": "2026-06-24T15:00:00",
  "B-qb2-qat": "2026-06-24T15:00:00",
  "B-qb2-sui": "2026-06-18T15:00:00",
  "B-qat-sui": "2026-06-13T15:00:00",

  // Grupo C
  "C-bra-mar": "2026-06-13T18:00:00",
  "C-bra-hti": "2026-06-19T21:00:00",
  "C-bra-sco": "2026-06-24T18:00:00",
  "C-mar-hti": "2026-06-24T18:00:00",
  "C-mar-sco": "2026-06-19T18:00:00",
  "C-hti-sco": "2026-06-13T21:00:00",

  // Grupo D
  "D-usa-par": "2026-06-12T21:00:00",
  "D-usa-aus": "2026-06-19T15:00:00",
  "D-usa-qd4": "2026-06-25T22:00:00",
  "D-par-aus": "2026-06-25T22:00:00",
  "D-par-qd4": "2026-06-19T00:00:00",
  "D-aus-qd4": "2026-06-13T00:00:00",

  // Grupo E
  "E-ger-cuw": "2026-06-14T13:00:00",
  "E-ger-civ": "2026-06-20T16:00:00",
  "E-ger-ecu": "2026-06-25T16:00:00",
  "E-cuw-civ": "2026-06-25T16:00:00",
  "E-cuw-ecu": "2026-06-20T22:00:00",
  "E-civ-ecu": "2026-06-14T19:00:00",

  // Grupo F
  "F-ned-jpn": "2026-06-14T16:00:00",
  "F-ned-qf3": "2026-06-20T13:00:00",
  "F-ned-tun": "2026-06-25T19:00:00",
  "F-jpn-qf3": "2026-06-25T19:00:00",
  "F-jpn-tun": "2026-06-20T00:00:00",
  "F-qf3-tun": "2026-06-14T22:00:00",

  // Grupo G
  "G-bel-egy": "2026-06-15T15:00:00",
  "G-bel-irn": "2026-06-21T15:00:00",
  "G-bel-nzl": "2026-06-26T23:00:00",
  "G-egy-irn": "2026-06-26T23:00:00",
  "G-egy-nzl": "2026-06-21T21:00:00",
  "G-irn-nzl": "2026-06-15T21:00:00",

  // Grupo H
  "H-esp-cpv": "2026-06-15T12:00:00",
  "H-esp-ksa": "2026-06-21T12:00:00",
  "H-esp-uru": "2026-06-26T20:00:00",
  "H-cpv-ksa": "2026-06-26T20:00:00",
  "H-cpv-uru": "2026-06-21T18:00:00",
  "H-ksa-uru": "2026-06-15T18:00:00",

  // Grupo I
  "I-fra-sen": "2026-06-16T15:00:00",
  "I-fra-qi3": "2026-06-22T17:00:00",
  "I-fra-nor": "2026-06-26T15:00:00",
  "I-sen-qi3": "2026-06-26T15:00:00",
  "I-sen-nor": "2026-06-22T20:00:00",
  "I-qi3-nor": "2026-06-16T18:00:00",

  // Grupo J
  "J-arg-alg": "2026-06-16T21:00:00",
  "J-arg-aut": "2026-06-22T13:00:00",
  "J-arg-jor": "2026-06-27T22:00:00",
  "J-alg-aut": "2026-06-27T22:00:00",
  "J-alg-jor": "2026-06-22T23:00:00",
  "J-aut-jor": "2026-06-16T00:00:00",

  // Grupo K
  "K-por-qk2": "2026-06-17T13:00:00",
  "K-por-uzb": "2026-06-23T13:00:00",
  "K-por-col": "2026-06-27T19:30:00",
  "K-qk2-uzb": "2026-06-27T19:30:00",
  "K-qk2-col": "2026-06-23T22:00:00",
  "K-uzb-col": "2026-06-17T22:00:00",

  // Grupo L
  "L-eng-cro": "2026-06-17T16:00:00",
  "L-eng-gha": "2026-06-23T16:00:00",
  "L-eng-pan": "2026-06-27T17:00:00",
  "L-cro-gha": "2026-06-27T17:00:00",
  "L-cro-pan": "2026-06-23T19:00:00",
  "L-gha-pan": "2026-06-17T19:00:00",
};


export { TEAMS_BASE, GROUPS, MATCH_SCHEDULE };