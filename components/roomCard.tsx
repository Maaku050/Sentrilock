import {
  Image,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { MapPin, User } from "lucide-react-native";

type RoomUI = {
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

const BASE_API_URL = "https://esp32cam-b5bx42kifq-uc.a.run.app";

export function RoomCard({ room, isDark }: { room: RoomUI; isDark: boolean }) {
  const occupied = room.occupied;
  const user = room.user;

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState<
    "idle" | "unlocking" | "success" | "error"
  >("idle");

  const theme = {
    background: isDark ? "#1a1a1a" : "#ffffff",
    cardBg: isDark ? "#0f0f0f" : "#f9fafb",
    text: isDark ? "#ffffff" : "#111827",
    textMuted: isDark ? "#9ca3af" : "#6b7280",
    border: isDark ? "#2a2a2a" : "#e5e7eb",
    accent: "#2563eb",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
  };

  const handleUnlock = async () => {
    if (occupied) return;

    setIsUnlocking(true);
    setUnlockStatus("unlocking");

    try {
      const response = await fetch(`${BASE_API_URL}/webControl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, unlock: true }),
      });

      const data = await response.json();

      setUnlockStatus(
        response.ok && data.status === "success" ? "success" : "error",
      );
      console.log(
        "Message: ",
        data.message,
        "Room Id: ",
        data.roomId,
        "Unluck: ",
        data.unlock,
      );
    } catch {
      setUnlockStatus("error");
    } finally {
      setTimeout(() => setUnlockStatus("idle"), 3000);
      setIsUnlocking(false);
    }
  };

  const getButtonColor = () => {
    switch (unlockStatus) {
      case "unlocking":
        return theme.warning;
      case "success":
        return theme.success;
      case "error":
        return theme.danger;
      default:
        return theme.success;
    }
  };

  const getButtonText = () => {
    switch (unlockStatus) {
      case "unlocking":
        return "Unlocking…";
      case "success":
        return "Unlocked ✓";
      case "error":
        return "Failed";
      default:
        return "Unlock";
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBg, borderColor: theme.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{room.name}</Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: occupied
                ? `${theme.danger}20`
                : `${theme.success}20`,
            },
          ]}
        >
          <Text
            style={{
              color: occupied ? theme.danger : theme.success,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {occupied ? "Occupied" : "Vacant"}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Avatar */}
        <View
          style={[
            styles.avatarWrapper,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {occupied && user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <User size={48} color={theme.textMuted} />
          )}
        </View>

        {/* Details */}
        <View style={styles.details}>
          {[
            ["Name", user?.name],
            ["Email", user?.email],
            ["Contact", user?.contact],
            ["Entered", user ? user.enteredAt.toLocaleString() : null],
          ].map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                {label}
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {occupied && value ? value : "—"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity
        disabled={occupied || isUnlocking}
        onPress={handleUnlock}
        style={[
          styles.button,
          {
            backgroundColor: getButtonColor(),
            opacity: occupied ? 0.4 : 1,
          },
        ]}
      >
        {isUnlocking && <ActivityIndicator size="small" color="#fff" />}
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  content: {
    flexDirection: "row",
    gap: 16,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  detailRow: {
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
