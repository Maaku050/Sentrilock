// context/roomsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

// === TYPES ===
export interface Room {
  id: string;
  status: boolean;
  personId: string | null;
  lastUpdated: any; // Timestamp
}

// === CONTEXT TYPE ===
interface RoomsContextType {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  refreshRooms: () => void;
}

// === CONTEXT ===
const RoomsContext = createContext<RoomsContextType>({
  rooms: [],
  loading: true,
  error: null,
  refreshRooms: () => {},
});

export const useRooms = () => useContext(RoomsContext);

// === PROVIDER ===
export const RoomsProvider = ({ children }: { children: React.ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = () => {
    console.log("✅ RoomsContext – Listening to rooms");

    const roomsQuery = collection(db, "rooms");

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const list: Room[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          status: doc.data().status || false,
          personId: doc.data().personId || null,
          lastUpdated: doc.data().lastUpdated,
        }));

        setRooms(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading rooms:", err);
        setError("Failed to load rooms");
        setLoading(false);
      },
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchRooms();

    return () => {
      unsubscribe();
      console.log("❌ RoomsContext Unmounted");
    };
  }, []);

  const refreshRooms = () => {
    setLoading(true);
    // Firestore listener will automatically update
  };

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        loading,
        error,
        refreshRooms,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
};
