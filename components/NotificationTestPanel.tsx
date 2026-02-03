// components/NotificationTestPanel.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Bell, Send } from "lucide-react-native";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  showTestNotification,
} from "@/utils/notifications";
import { sendCloudTestNotification } from "@/utils/notifications";

interface NotificationTestPanelProps {
  isDark?: boolean;
}

export function NotificationTestPanel({
  isDark = false,
}: NotificationTestPanelProps) {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    getNotificationPermissionStatus(),
  );
  const [testing, setTesting] = useState(false);

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    accent: "#3b82f6",
  };

  const handleRequestPermission = async () => {
    const token = await requestNotificationPermission();
    setPermission(getNotificationPermissionStatus());
    if (token) {
      alert(`Permission granted! Token: ${token.substring(0, 20)}...`);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const success = await sendCloudTestNotification();
      if (success) {
        alert("Test notification sent via Cloud Function!");
      }
      setTimeout(() => setTesting(false), 1000);
    } catch (error) {
      console.error("Test notification error:", error);
      setTesting(false);
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case "granted":
        return "#10b981";
      case "denied":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  };

  const getPermissionText = () => {
    switch (permission) {
      case "granted":
        return "Enabled";
      case "denied":
        return "Blocked";
      default:
        return "Not Set";
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Bell size={20} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>
          Notifications Test Panel
        </Text>
      </View>

      {/* Permission Status */}
      <View style={styles.statusRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Status:
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getPermissionColor() + "20" },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getPermissionColor() },
            ]}
          />
          <Text style={[styles.statusText, { color: getPermissionColor() }]}>
            {getPermissionText()}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {permission !== "granted" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleRequestPermission}
          >
            <Bell size={18} color="#fff" />
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        )}

        {permission === "granted" && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#10b981" },
              testing && styles.buttonDisabled,
            ]}
            onPress={handleTestNotification}
            disabled={testing}
          >
            <Send size={18} color="#fff" />
            <Text style={styles.buttonText}>
              {testing ? "Sending..." : "Send Test Notification"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      {permission === "denied" && (
        <Text style={[styles.info, { color: "#ef4444" }]}>
          Notifications are blocked. Please enable them in your browser
          settings.
        </Text>
      )}

      {permission === "granted" && (
        <Text style={[styles.info, { color: theme.textSecondary }]}>
          You will receive real-time alerts for security events.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
});
