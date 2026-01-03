import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

// Comprehensive check for all required Firebase config keys
const missingKeys = Object.entries(firebaseConfig).filter(([key, value]) => !value);

if (missingKeys.length > 0) {
    const missingKeyNames = missingKeys.map(([key]) => `VITE_${key.toUpperCase()}`).join(', ');
    const errorMessage = `CRITICAL ERROR: Your .env.local file is missing the following required Firebase keys: ${missingKeyNames}. The app cannot start.`;
    
    console.error(errorMessage);
    alert(errorMessage);
    // Throw an error to halt execution completely
    throw new Error(errorMessage);
}

// Initialize Firebase
console.log("All Firebase keys are present. Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
