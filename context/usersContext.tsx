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
        console.log(
          `📊 Fetched ${snapshot.docs.length} profiles from Firestore`,
        );

        const list: Profiles[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Log raw data to see what's coming from Firestore
          console.log(`👤 Processing user: ${doc.id}`, {
            name: data.name,
            email: data.email,
            imageUrl: data.imageUrl,
            hasImageUrl: !!data.imageUrl,
            imageUrlType: typeof data.imageUrl,
            allKeys: Object.keys(data),
          });

          // Helper to convert Firestore Timestamp to Date
          const toDate = (timestamp: any): Date => {
            if (!timestamp) return new Date();
            if (timestamp.toDate) return timestamp.toDate();
            if (timestamp instanceof Date) return timestamp;
            return new Date(timestamp);
          };

          // Build profile with proper type conversion
          const profile: Profiles = {
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            imageUrl: data.imageUrl || "",
            registeredDate: toDate(data.registeredAt || data.registeredDate),
            updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
          };

          // Add all other fields (like room1, room2, etc.) dynamically
          Object.keys(data).forEach((key) => {
            if (
              ![
                "id",
                "name",
                "email",
                "phone",
                "imageUrl",
                "imagePath",
                "registeredAt",
                "registeredDate",
                "updatedAt",
                "embedding",
              ].includes(key)
            ) {
              profile[key] = data[key];
            }
          });

          // Log the built profile
          console.log(`✅ Built profile for ${data.name}:`, {
            id: profile.id,
            imageUrl: profile.imageUrl,
            imageUrlLength: profile.imageUrl?.length || 0,
            startsWithHttp: profile.imageUrl?.startsWith("http"),
          });

          return profile;
        });

        console.log(
          `🎯 Final profiles array:`,
          list.map((p) => ({
            id: p.id,
            name: p.name,
            hasImageUrl: !!p.imageUrl,
          })),
        );

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
    console.log("Faked refresh");
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
