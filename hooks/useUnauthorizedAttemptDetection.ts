// hooks/useUnauthorizedAttemptDetection.ts
import { useEffect, useState, useRef } from "react";
import { db } from "@/firebase/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { showCustomNotification } from "@/utils/notifications";

interface UnauthorizedAttempt {
  id: string;
  action: string;
  timestamp: Timestamp;
  roomId: string;
  userId?: string;
  user?: {
    name: string;
  };
}

interface DetectionResult {
  detected: boolean;
  attempts: UnauthorizedAttempt[];
  roomId: string;
  timestamp: Date;
}

/**
 * Custom hook to detect 3 consecutive unauthorized attempts in real-time
 * Listens to Firestore logs collection and triggers notifications
 */
export function useUnauthorizedAttemptDetection() {
  const [lastDetection, setLastDetection] = useState<DetectionResult | null>(
    null,
  );
  const [isMonitoring, setIsMonitoring] = useState(false);
  const previousLogsRef = useRef<UnauthorizedAttempt[]>([]);
  const notificationShownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log("🔒 Starting unauthorized attempt detection...");
    setIsMonitoring(true);

    // Query the last 3 logs, ordered by timestamp
    const logsQuery = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(3),
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs: UnauthorizedAttempt[] = [];

        snapshot.forEach((doc) => {
          logs.push({
            id: doc.id,
            ...doc.data(),
          } as UnauthorizedAttempt);
        });

        // Reverse to get chronological order
        logs.reverse();

        console.log(
          "📊 Recent logs:",
          logs.map((l) => l.action),
        );

        // Check if we have 3 logs
        if (logs.length === 3) {
          // Check if all 3 are consecutive unauthorized attempts
          const allUnauthorized = logs.every(
            (log) => log.action === "unauthorized_attempt",
          );

          if (allUnauthorized) {
            const roomId = logs[logs.length - 1].roomId || "Unknown Location";
            const detectionKey = logs.map((l) => l.id).join("-");

            // Only show notification if we haven't already shown it for this pattern
            if (!notificationShownRef.current.has(detectionKey)) {
              console.log(
                "🚨 THREE CONSECUTIVE UNAUTHORIZED ATTEMPTS DETECTED!",
              );

              // Show browser notification
              showSecurityAlert(roomId, logs);

              // Update state
              const detection: DetectionResult = {
                detected: true,
                attempts: logs,
                roomId: roomId,
                timestamp: new Date(),
              };

              setLastDetection(detection);

              // Mark this pattern as shown
              notificationShownRef.current.add(detectionKey);

              // Clear old detection keys (keep last 10)
              if (notificationShownRef.current.size > 10) {
                const keysArray = Array.from(notificationShownRef.current);
                notificationShownRef.current = new Set(keysArray.slice(-10));
              }
            }
          }
        }

        // Store current logs for next comparison
        previousLogsRef.current = logs;
      },
      (error) => {
        console.error("Error monitoring logs:", error);
        setIsMonitoring(false);
      },
    );

    // Cleanup listener on unmount
    return () => {
      console.log("🔒 Stopping unauthorized attempt detection");
      setIsMonitoring(false);
      unsubscribe();
    };
  }, []);

  return {
    lastDetection,
    isMonitoring,
    clearLastDetection: () => setLastDetection(null),
  };
}

/**
 * Show security alert notification
 */
async function showSecurityAlert(
  roomId: string,
  attempts: UnauthorizedAttempt[],
): Promise<void> {
  try {
    // Show custom notification
    await showCustomNotification(
      "🚨 SECURITY ALERT: Multiple Unauthorized Attempts",
      {
        body: `3 consecutive unauthorized access attempts detected at ${roomId}`,
        icon: "/icon.png",
        badge: "/icon.png",
        tag: "security-alert",
        requireInteraction: true, // Keep notification visible
        renotify: true, // Alert even if previous alert exists
        vibrate: [300, 100, 300, 100, 300], // Strong vibration
        timestamp: Date.now(),
        data: {
          type: "security_alert",
          severity: "critical",
          roomId: roomId,
          url: "/",
          attempts: attempts.map((a) => ({
            id: a.id,
            timestamp: a.timestamp.toDate().toISOString(),
            userId: a.userId,
          })),
        },
      },
    );

    // Play urgent sound (if you have an audio file)
    playUrgentAlert();
  } catch (error) {
    console.error("Error showing security alert:", error);
  }
}

/**
 * Play urgent alert sound
 */
function playUrgentAlert(): void {
  try {
    // Play multiple beeps for urgent alert
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    // Create three beeps
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // High frequency for alert
        gainNode.gain.value = 0.3; // Volume

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2); // 200ms beep
      }, i * 300); // 300ms between beeps
    }
  } catch (error) {
    console.log("Could not play alert sound:", error);
  }
}
