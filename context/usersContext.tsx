// context/usersContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { Profiles } from "@/_types";

// === CONTEXT TYPE ===
interface UsersContextType {
  profiles: Profiles[];
  loading: boolean;
  error: string | null;
  refreshProfiles: () => void;
}

// === CONTEXT ===
const UsersContext = createContext<UsersContextType>({
  profiles: [],
  loading: true,
  error: null,
  refreshProfiles: () => {},
});

export const useUsers = () => useContext(UsersContext);

// === PROVIDER ===
export const UsersProvider = ({ children }: { children: React.ReactNode }) => {
  const [profiles, setProfiles] = useState<Profiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = () => {
    console.log("✅ UsersContext – Listening to known_persons");

    const profilesQuery = collection(db, "known_persons");

    const unsubscribe = onSnapshot(
      profilesQuery,
      (snapshot) => {
        const list: Profiles[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          phone: doc.data().phone,
          imageUrl: doc.data().imageUrl,
        }));

        setProfiles(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading profiles:", err);
        setError("Failed to load profiles");
        setLoading(false);
      },
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchProfiles();

    return () => {
      unsubscribe();
      console.log("❌ UsersContext Unmounted");
    };
  }, []);

  const refreshProfiles = () => {
    setLoading(true);
    // Firestore listener will automatically update
  };

  return (
    <UsersContext.Provider
      value={{
        profiles,
        loading,
        error,
        refreshProfiles,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};
