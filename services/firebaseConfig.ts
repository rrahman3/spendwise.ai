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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Debugging: Check if config is loaded
console.log("Environment Keys Loaded:", Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing! Check your .env.local file.");
    console.error("Make sure your variable is named VITE_API_KEY");
} else if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes('.')) {
    console.error("CRITICAL ERROR: Your VITE_AUTH_DOMAIN seems invalid:", firebaseConfig.authDomain);
    console.error("It should look like 'your-project.firebaseapp.com', but it looks like an API Key or ID.");
    alert(`CONFIGURATION ERROR: Your VITE_AUTH_DOMAIN is incorrect.\n\nCurrent value: ${firebaseConfig.authDomain}\n\nIt should look like 'project-id.firebaseapp.com'.\nCheck your .env.local file.`);
} else {
    console.log("Firebase initialized with project:", firebaseConfig.projectId);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
