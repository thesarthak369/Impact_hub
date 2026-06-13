"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  User 
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  role: string | null;
  metadata: any | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  metadata: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const protectedRoutes = [
  "/ngo-dashboard",
  "/volunteer-dashboard",
  "/dashboard",
  "/settings",
  "/notifications",
  "/onboarding",
  "/ai-engine",
  "/ai-briefing",
  "/reports",
  "/live-map",
  "/incidents",
  "/ngo-posts"
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Subscribe to user profile document changes in Firestore
        const profileRef = doc(db, "profiles", currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setRole(data.role || null);
            setMetadata(data.metadata || null);
          } else {
            setRole(null);
            setMetadata(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to profile changes:", error);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setRole(null);
        setMetadata(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Handle Client-Side Route Protection
  useEffect(() => {
    if (loading) return;

    const isProtected = protectedRoutes.some((route) => 
      pathname === route || pathname.startsWith(route + "/")
    );

    if (!user && isProtected) {
      router.push("/login");
    }

    if (user && pathname === "/login") {
      // If user is logged in, redirect them to onboarding if role is missing, or dashboard
      if (role) {
        router.push(role === "ngo" ? "/ngo-dashboard" : "/volunteer-dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [user, role, pathname, loading, router]);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, metadata, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
