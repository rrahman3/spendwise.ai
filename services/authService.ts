import { UserProfile } from "../types";
import { auth, googleProvider } from "./firebaseConfig";
import { signInWithPopup, signOut } from "firebase/auth";

export const authService = {
  signInWithGoogle: async (): Promise<UserProfile> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      return {
        id: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        avatar: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
        totalSpent: 0, // This would normally come from DB
        receiptCount: 0,
        isAuthenticated: true
      };
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem('spendwise_profile');
    // We might want to keep receipts in local storage or clear them? 
    // Existing logic clears them in App.tsx handleLogout, so we just handle auth here.
  }
};
