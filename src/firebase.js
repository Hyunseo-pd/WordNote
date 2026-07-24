// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7OcYt_5L4UxpLc5WZIIz-P6EtT1DaeQ4",
  authDomain: "wordnote-65a0d.firebaseapp.com",
  projectId: "wordnote-65a0d",
  storageBucket: "wordnote-65a0d.firebasestorage.app",
  messagingSenderId: "999206543266",
  appId: "1:999206543266:web:1bf1d94e045c926e389cfb",
  measurementId: "G-WYWG84G7EW",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
