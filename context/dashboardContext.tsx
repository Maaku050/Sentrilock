// context/dashboardContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { Logs, Profiles, Rooms, RoomUI } from "@/_types";

// === CONTEXT TYPE ===
interface LogsContextType {
  profiles: Profiles[];
  rooms: Rooms[];
  roomsUI: RoomUI[];
  logs: Logs[];
  loading: boolean;
  error: string | null;
  selectedRoom: string | null;
  setSelectedRoom: (id: string | null) => void;
}

// === CONTEXT ===
const DashboardContext = createContext<LogsContextType>({
  profiles: [],
  rooms: [],
  roomsUI: [],
  logs: [],
  loading: true,
  error: null,
  selectedRoom: null,
  setSelectedRoom: () => {},
});

export const useLogs = () => useContext(DashboardContext);

// === PROVIDER ===
export const DashboardProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [logs, setLogs] = useState<Logs[]>([]);
  const [profiles, setProfiles] = useState<Profiles[]>([]);
  const [rooms, setRooms] = useState<Rooms[]>([]);
  const [roomsUI, setRoomsUI] = useState<RoomUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    console.log("✅ LogsContext Mounted – Listening to logs");

    const logsQuery = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
    );
    const profileQuery = query(collection(db, "known_persons"));
    const roomsQuery = query(collection(db, "rooms"));

    const unsubprofile = onSnapshot(
      profileQuery,
      (snapshot) => {
        const list: Profiles[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Profiles, "id">),
        }));

        setProfiles(list);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error loading profiles:", err);
        setError("Failed to load profiles");
        setLoading(false);
      },
    );

    const unsubrooms = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const list: Rooms[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Rooms, "id">),
        }));

        setRooms(list);
        console.log("Room list: ", list);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error loading profiles:", err);
        setError("Failed to load profiles");
        setLoading(false);
      },
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const list: Logs[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Logs, "id">),
        }));

        setLogs(list);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error loading logs:", err);
        setError("Failed to load logs");
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      unsubprofile();
      unsubrooms();
      console.log("❌ DashboardContext Unmounted");
    };
  }, []);

  useEffect(() => {
    if (!profiles.length || !rooms.length) return;

    const profileMap = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );

    const mappedRooms: RoomUI[] = rooms.map((room) => {
      const person = profileMap.get(room.personId);

      // 🚪 VACANT ROOM
      if (!room.status || !person) {
        return {
          id: room.id, // still UID internally
          name: room.id + " is vacant",
          occupied: false,
          user: null,
        };
      }

      // 🧑 OCCUPIED ROOM
      return {
        id: room.id, // UID
        name: room.id, // ✅ DISPLAY USER NAME
        occupied: true,
        user: {
          name: person.name,
          email: person.email,
          contact: person.phone,
          photo: person.imageUrl,
          enteredAt: room.lastUpdated.toDate(),
        },
      };
    });

    setRoomsUI(mappedRooms);
    console.log("Rooms UI: ", mappedRooms);
  }, [profiles, rooms]);

  return (
    <DashboardContext.Provider
      value={{
        logs: selectedRoom
          ? logs.filter((log) => log.roomId === selectedRoom)
          : logs,
        loading,
        error,
        selectedRoom,
        setSelectedRoom,
        profiles,
        rooms,
        roomsUI,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
