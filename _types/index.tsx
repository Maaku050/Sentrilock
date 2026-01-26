import { Timestamp } from "firebase/firestore";

export type Profiles = {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string;
};

export type Rooms = {
  id: string;
  lastUpdated: Timestamp;
  status: boolean;
  personId: string;
};

type LogUser = {
  id: string;
  name: string;
};

export type Logs = {
  id: string;
  roomId: string;
  action: string;
  user: LogUser;
  timestamp: Timestamp;
};

export type RoomUI = {
  id: string;
  name: string;
  occupied: boolean;
  user: {
    name: string;
    email: string;
    contact: string;
    photo: string;
    enteredAt: Date;
  } | null;
};
