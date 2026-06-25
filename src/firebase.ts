import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0530238628",
  appId: "1:113986107685:web:3c13c778eae1f9d633c2cc",
  apiKey: "AIzaSyClB5D-bS2aC_lyk8-lCpexZi7jf7H14E8",
  authDomain: "gen-lang-client-0530238628.firebaseapp.com",
  storageBucket: "gen-lang-client-0530238628.firebasestorage.app",
  messagingSenderId: "113986107685",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-41174e61-5e13-499e-8225-de7d037c36b8");
