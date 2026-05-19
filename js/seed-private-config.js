import { TEAMS_BASE, GROUPS, MATCH_SCHEDULE } from "./data.js";
import { savePrivateConfig } from "./firebase.js";

export async function seedPrivateConfig() {
  await savePrivateConfig({
    teams: TEAMS_BASE,
    groups: GROUPS,
    schedule: MATCH_SCHEDULE,
  });

  console.log("Config privada subida a Firestore");
}