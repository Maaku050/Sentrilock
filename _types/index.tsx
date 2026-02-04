import { Timestamp } from "firebase/firestore";

export interface Profiles {
  /** Firestore document ID */
  id: string;

  /** Basic identity */
  name: string;
  email: string;
  phone: string;
  imageUrl: string;

  /** Registration metadata */
  registeredDate: Date;
  updatedAt?: Date;

  /** Time-based access control (HH:MM, 24-hour format) */
  startTime?: string | null;
  endTime?: string | null;

  /**
   * Dynamic room permissions.
   * Each room ID maps to a boolean indicating access.
   *
   * Example:
   * {
   *   "roomA": true,
   *   "roomB": false
   * }
   */
  [roomId: string]: string | boolean | Date | Timestamp | null | undefined;
}

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
