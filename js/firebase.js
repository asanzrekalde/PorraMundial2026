import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADU5xvMi9YIP4R6ST_U-C2zDFVXHQW9m8",
  authDomain: "porramundial2026-9b5f3.firebaseapp.com",
  projectId: "porramundial2026-9b5f3",
  storageBucket: "porramundial2026-9b5f3.firebasestorage.app",
  messagingSenderId: "1085247680183",
  appId: "1:1085247680183:web:74fce7b73a7c2cedcb6732",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const configDocRef = doc(db, "porra", "config");
const sharedDocRef = doc(db, "porra", "sharedState");

function isMobileDevice() {
  return (
    window.matchMedia("(pointer:coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export async function signInGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPopup(auth, provider);
}

export async function finishRedirectSignIn() {
  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("Error en redirect sign-in:", error);
    alert("No se pudo completar el login con Google.");
  }
}

export async function logOut() {
  await signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function savePrivateConfig(config) {
  await setDoc(
    configDocRef,
    {
      ...config,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email ?? null,
    },
    { merge: true }
  );
}

export async function loadPrivateConfig() {
  const snap = await getDoc(configDocRef);
  return snap.exists() ? snap.data() : null;
}

export async function loadRemoteState() {
  const snap = await getDoc(sharedDocRef);
  return snap.exists() ? snap.data() : null;
}

export async function saveRemoteState(state) {
  await setDoc(
    sharedDocRef,
    {
      matches: state.matches,
      knockoutResults: state.knockoutResults || {},
      thirdAssignments: state.thirdAssignments || {},
      thirdQualifiedGroupsOverride:
        state.thirdQualifiedGroupsOverride || [],
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email ?? null,
    },
    { merge: true }
  );
}

export function subscribeRemoteState(callback) {
  return onSnapshot(sharedDocRef, (snap) => {
    if (!snap.exists()) return;
    callback(snap.data());
  });
}