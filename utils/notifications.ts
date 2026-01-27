// utils/notifications.ts
import { messaging } from "../firebase/firebaseConfig";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

// Replace with your actual VAPID key from Firebase Console
// Go to: Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE";

// Storage key for local token cache
const TOKEN_STORAGE_KEY = "sentrilock_fcm_token";
const TOKEN_TIMESTAMP_KEY = "sentrilock_fcm_token_timestamp";
const TOKEN_EXPIRY_DAYS = 7; // Refresh token every 7 days

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  type?: "info" | "success" | "warning" | "error";
}

export interface NotificationConfig {
  enableSound?: boolean;
  enableVibration?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = (): boolean => {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

/**
 * Check if token needs refresh
 */
const shouldRefreshToken = (): boolean => {
  const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
  if (!timestamp) return true;

  const daysSinceCreation =
    (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > TOKEN_EXPIRY_DAYS;
};

/**
 * Get cached FCM token from localStorage
 */
export const getCachedToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !shouldRefreshToken()) {
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error getting cached token:", error);
    return null;
  }
};

/**
 * Cache FCM token in localStorage
 */
const cacheToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error("Error caching token:", error);
  }
};

/**
 * Clear cached token
 */
export const clearCachedToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  } catch (error) {
    console.error("Error clearing cached token:", error);
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<
  string | null
> => {
  try {
    // Check browser support
    if (!isNotificationSupported()) {
      console.warn("Notifications not supported in this browser");
      return null;
    }

    if (!messaging) {
      console.warn("Firebase Messaging not initialized");
      return null;
    }

    // Check for cached token first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      console.log("Using cached FCM token");
      return cachedToken;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted");

      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" },
        );

        console.log("Service Worker registered:", registration.scope);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log("Service Worker ready");

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log("FCM Token obtained:", token.substring(0, 20) + "...");
          cacheToken(token);
          return token;
        } else {
          console.error("No registration token available");
          return null;
        }
      } catch (swError) {
        console.error("Service Worker registration failed:", swError);

        // Show helpful error message
        if (swError instanceof Error) {
          if (swError.message.includes("VAPID")) {
            console.error(
              "Invalid VAPID key. Please check your Firebase configuration.",
            );
          } else if (swError.message.includes("denied")) {
            console.error(
              "Service Worker registration denied. Check browser settings.",
            );
          }
        }
        return null;
      }
    } else if (permission === "denied") {
      console.log("Notification permission denied");
      return null;
    } else {
      console.log("Notification permission dismissed");
      return null;
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
};

/**
 * Delete current FCM token
 */
export const deleteFCMToken = async (): Promise<boolean> => {
  try {
    if (!messaging) {
      console.warn("Messaging not available");
      return false;
    }

    await deleteToken(messaging);
    clearCachedToken();
    console.log("FCM token deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting FCM token:", error);
    return false;
  }
};

/**
 * Refresh FCM token (get new token)
 */
export const refreshFCMToken = async (
  userId?: string,
): Promise<string | null> => {
  try {
    // Delete old token
    await deleteFCMToken();

    // Get new token
    const newToken = await requestNotificationPermission();

    // Save new token to Firestore if userId provided
    if (newToken && userId) {
      await saveFCMToken(userId, newToken);
    }

    return newToken;
  } catch (error) {
    console.error("Error refreshing FCM token:", error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn("Messaging not available");
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);

    // Play notification sound if enabled
    playNotificationSound();

    // Trigger device vibration if supported and enabled
    triggerVibration();

    callback(payload);
  });
};

/**
 * Save FCM token to Firestore for the current user
 */
export const saveFCMToken = async (
  userId: string,
  token: string,
): Promise<void> => {
  try {
    if (!userId || !token) {
      console.error("UserId or token is missing");
      return;
    }

    const userRef = doc(db, "users", userId);

    // Get current user data
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // Check if token already exists
    const existingTokens = userData?.fcmTokens?.web || [];
    const isNewToken = !existingTokens.includes(token);

    if (isNewToken) {
      // Save token with metadata
      await setDoc(
        userRef,
        {
          fcmTokens: {
            web: token,
            webTokens: arrayUnion(token), // Store multiple tokens for multi-device support
            updatedAt: serverTimestamp(),
            lastUsed: serverTimestamp(),
            browser: getBrowserInfo(),
            platform: getPlatformInfo(),
          },
          notificationSettings: {
            enabled: true,
            types: ["all"], // Can be customized per user
          },
        },
        { merge: true },
      );

      console.log("FCM token saved to Firestore successfully");
    } else {
      // Just update the timestamp
      await updateDoc(userRef, {
        "fcmTokens.lastUsed": serverTimestamp(),
      });
      console.log("FCM token timestamp updated");
    }
  } catch (error) {
    console.error("Error saving FCM token:", error);
    throw error;
  }
};

/**
 * Remove FCM token from Firestore (for logout)
 */
export const removeFCMToken = async (
  userId: string,
  token?: string,
): Promise<void> => {
  try {
    if (!userId) {
      console.error("UserId is missing");
      return;
    }

    const userRef = doc(db, "users", userId);

    if (token) {
      // Remove specific token (multi-device support)
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const tokens = userData?.fcmTokens?.webTokens || [];
      const updatedTokens = tokens.filter((t: string) => t !== token);

      await updateDoc(userRef, {
        "fcmTokens.webTokens": updatedTokens,
        "fcmTokens.web": updatedTokens.length > 0 ? updatedTokens[0] : null,
        "fcmTokens.updatedAt": serverTimestamp(),
      });
    } else {
      // Remove all tokens
      await setDoc(
        userRef,
        {
          fcmTokens: {
            web: null,
            webTokens: [],
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true },
      );
    }

    clearCachedToken();
    console.log("FCM token removed from Firestore");
  } catch (error) {
    console.error("Error removing FCM token:", error);
  }
};

/**
 * Check current notification permission status
 */
export const getNotificationPermissionStatus =
  (): NotificationPermission | null => {
    if (!isNotificationSupported()) {
      return null;
    }
    return Notification.permission;
  };

/**
 * Show a test notification (for testing purposes)
 */
export const showTestNotification = async (
  config?: NotificationConfig,
): Promise<void> => {
  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  const notification = new Notification("🔐 SentriLock Test", {
    body: "This is a test notification from your security system",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: "test-notification",
    requireInteraction: config?.requireInteraction ?? false,
    silent: config?.silent ?? false,
    timestamp: Date.now(),
    data: {
      type: "test",
      url: window.location.href,
    },
  });

  // Play sound and vibrate
  if (config?.enableSound !== false) {
    playNotificationSound();
  }
  if (config?.enableVibration !== false) {
    triggerVibration();
  }

  // Handle notification click
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

/**
 * Create a custom notification with full control
 */
export const showCustomNotification = async (
  title: string,
  options: NotificationOptions & { type?: string },
): Promise<void> => {
  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  const notification = new Notification(title, {
    ...options,
    icon: options.icon || "/icon.png",
    badge: options.badge || "/icon.png",
    timestamp: options.timestamp || Date.now(),
  });

  notification.onclick = () => {
    window.focus();
    if (options.data?.url) {
      window.location.href = options.data.url;
    }
    notification.close();
  };
};

/**
 * Play notification sound
 */
const playNotificationSound = (): void => {
  try {
    // Check if sound is enabled in user settings (you can customize this)
    const soundEnabled = true; // Get from user settings

    if (soundEnabled && "Audio" in window) {
      // You can add a custom notification sound file
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.3;
      audio.play().catch((err) => {
        console.log("Could not play notification sound:", err);
      });
    }
  } catch (error) {
    console.log("Notification sound error:", error);
  }
};

/**
 * Trigger device vibration
 */
const triggerVibration = (): void => {
  try {
    if ("vibrate" in navigator) {
      // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
      navigator.vibrate([200, 100, 200]);
    }
  } catch (error) {
    console.log("Vibration error:", error);
  }
};

/**
 * Get browser information
 */
const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Unknown";
};

/**
 * Get platform information
 */
const getPlatformInfo = (): string => {
  const platform = navigator.platform;
  if (platform.includes("Win")) return "Windows";
  if (platform.includes("Mac")) return "MacOS";
  if (platform.includes("Linux")) return "Linux";
  if (platform.includes("iPhone") || platform.includes("iPad")) return "iOS";
  if (platform.includes("Android")) return "Android";
  return "Unknown";
};

/**
 * Check if service worker is active
 */
export const isServiceWorkerActive = async (): Promise<boolean> => {
  try {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration?.active;
  } catch (error) {
    console.error("Error checking service worker:", error);
    return false;
  }
};

/**
 * Update service worker
 */
export const updateServiceWorker = async (): Promise<boolean> => {
  try {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log("Service worker updated");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating service worker:", error);
    return false;
  }
};

/**
 * Get notification statistics for dashboard
 */
export const getNotificationStats = async (
  userId: string,
): Promise<{
  totalSent: number;
  lastReceived: Date | null;
  enabled: boolean;
}> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    return {
      totalSent: userData?.notificationStats?.totalSent || 0,
      lastReceived: userData?.notificationStats?.lastReceived?.toDate() || null,
      enabled: userData?.notificationSettings?.enabled || false,
    };
  } catch (error) {
    console.error("Error getting notification stats:", error);
    return {
      totalSent: 0,
      lastReceived: null,
      enabled: false,
    };
  }
};

/**
 * Log notification interaction (for analytics)
 */
export const logNotificationInteraction = async (
  userId: string,
  action: "received" | "clicked" | "dismissed",
  notificationId?: string,
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      [`notificationStats.${action}Count`]: serverTimestamp(),
      "notificationStats.lastInteraction": serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging notification interaction:", error);
  }
};
