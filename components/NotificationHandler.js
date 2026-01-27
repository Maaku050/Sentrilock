// components/NotificationHandler.js
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  requestNotificationPermission,
  onMessageListener,
  saveFCMToken,
} from "@/utils/notifications";
import { auth } from "@/firebase/firebaseConfig";

export default function NotificationHandler() {
  const [notification, setNotification] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (Notification.permission === "granted") {
      setupNotifications();
    } else if (Notification.permission === "default") {
      setShowPrompt(true);
    }

    const unsubscribe = onMessageListener((payload) => {
      if (!payload?.notification) return;

      setNotification({
        title: payload.notification.title,
        body: payload.notification.body,
      });

      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  const setupNotifications = async () => {
    const token = await requestNotificationPermission();

    if (token && auth.currentUser) {
      await saveFCMToken(auth.currentUser.uid, token);
    }
  };

  const handleEnableNotifications = async () => {
    setShowPrompt(false);
    await setupNotifications();
  };

  if (Platform.OS !== "web") return null;

  return (
    <>
      {/* Permission Prompt */}
      {showPrompt && (
        <View style={styles.promptContainer}>
          <View style={styles.prompt}>
            <Text style={styles.promptTitle}>Enable Notifications</Text>
            <Text style={styles.promptText}>
              Stay updated with important alerts and messages
            </Text>
            <View style={styles.promptButtons}>
              <TouchableOpacity
                style={[styles.button, styles.dismissButton]}
                onPress={() => setShowPrompt(false)}
              >
                <Text style={styles.dismissButtonText}>Not Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.enableButton]}
                onPress={handleEnableNotifications}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Foreground Notification Display */}
      {notification && (
        <View style={styles.notificationContainer}>
          <View style={styles.notification}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.body}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setNotification(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  promptContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  prompt: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  promptText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  promptButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dismissButton: {
    backgroundColor: "#f0f0f0",
  },
  dismissButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  enableButton: {
    backgroundColor: "#007AFF",
  },
  enableButtonText: {
    color: "white",
    fontWeight: "600",
  },
  notificationContainer: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 10000,
    maxWidth: 400,
  },
  notification: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  notificationBody: {
    fontSize: 14,
    color: "#666",
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#999",
  },
});
