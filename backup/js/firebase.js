import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const sharedDocRef = doc(db, "porra", "sharedState");

export async function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logOut() {
  return signOut(auth);
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loadRemoteState() {
  const snap = await getDoc(sharedDocRef);
  return snap.exists() ? snap.data() : null;
}

export async function saveRemoteState(state) {
  await setDoc(sharedDocRef, {
    matches: state.matches,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function subscribeRemoteState(cb) {
  return onSnapshot(sharedDocRef, (snap) => {
    if (snap.exists()) cb(snap.data());
  });
}