// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

interface LogData {
  action: string;
  roomId?: string;
  userId?: string;
  timestamp?: any;
  user?: { name?: string };
}

/* ============================================================================
 * FIRESTORE TRIGGER (V2)
 * Trigger: When a new log is created
 * ========================================================================== */
export const onLogCreated = onDocumentCreated("logs/{logId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const logData = snapshot.data();
  const logId = event.params.logId;

  logger.info("New log created", { logId, action: logData.action });

  try {
    if (logData.action === "unauthorized_attempt") {
      await checkForConsecutiveUnauthorizedAttempts(logData, logId);
    }

    await sendActionNotification(logData, logId);
  } catch (error) {
    logger.error("Error processing log", error);
  }
});

/* ============================================================================
 * SECURITY DETECTION
 * ========================================================================== */
async function checkForConsecutiveUnauthorizedAttempts(
  _currentLog: any,
  _currentLogId: string,
): Promise<void> {
  const snapshot = await db
    .collection("logs")
    .orderBy("timestamp", "desc")
    .limit(3)
    .get();

  if (snapshot.size < 3) return;

  const logs: (LogData & { id: string })[] = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as LogData) }))
    .reverse();

  const allUnauthorized = logs.every(
    (log) => log.action === "unauthorized_attempt",
  );

  if (!allUnauthorized) return;

  const roomId = logs[2].roomId || "Unknown Location";

  logger.warn("SECURITY ALERT: 3 consecutive unauthorized attempts", {
    roomId,
  });

  await sendSecurityAlert(roomId, logs);
  await createSecurityIncident(roomId, logs);
}

/* ============================================================================
 * SECURITY ALERT NOTIFICATION
 * ========================================================================== */
async function sendSecurityAlert(
  roomId: string,
  attempts: any[],
): Promise<void> {
  const usersSnapshot = await db
    .collection("users")
    .where("fcmTokens.web", "!=", null)
    .get();

  if (usersSnapshot.empty) return;

  const tokens = new Set<string>();
  const userIds: string[] = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    data.fcmTokens?.web && tokens.add(data.fcmTokens.web);
    data.fcmTokens?.webTokens?.forEach((t: string) => tokens.add(t));
    userIds.push(doc.id);
  });

  if (tokens.size === 0) return;

  const response = await messaging.sendEachForMulticast({
    tokens: Array.from(tokens),
    notification: {
      title: "🚨 SECURITY ALERT",
      body: `3 consecutive unauthorized attempts at ${roomId}`,
    },
    data: {
      type: "security_alert",
      severity: "critical",
      roomId,
      attemptIds: attempts.map((a) => a.id).join(","),
    },
    webpush: {
      fcmOptions: { link: "/" },
    },
  });

  if (response.failureCount > 0) {
    const invalidTokens = response.responses
      .map((r, i) => (!r.success ? Array.from(tokens)[i] : null))
      .filter(Boolean) as string[];

    await cleanupInvalidTokens(invalidTokens);
  }

  await updateNotificationStats(userIds, "security_alert");
}

/* ============================================================================
 * ACTION NOTIFICATIONS
 * ========================================================================== */
async function sendActionNotification(
  logData: any,
  logId: string,
): Promise<void> {
  if (!["unauthorized_attempt", "admin_control"].includes(logData.action)) {
    return;
  }

  const snapshot = await db
    .collection("users")
    .where("notificationSettings.enabled", "==", true)
    .where("fcmTokens.web", "!=", null)
    .get();

  if (snapshot.empty) return;

  const tokens = snapshot.docs
    .map((d) => d.data().fcmTokens?.web)
    .filter(Boolean);

  if (tokens.length === 0) return;

  const actionText = logData.action
    .split("_")
    .map((w: string) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: `${actionText} - ${logData.roomId}`,
      body: logData.user?.name || "Unknown user",
    },
    data: {
      type: "activity_log",
      action: logData.action,
      roomId: logData.roomId,
      logId,
    },
  });
}

/* ============================================================================
 * INCIDENT CREATION
 * ========================================================================== */
async function createSecurityIncident(
  roomId: string,
  attempts: any[],
): Promise<void> {
  await db.collection("security_incidents").add({
    type: "consecutive_unauthorized_attempts",
    roomId,
    attemptCount: attempts.length,
    attempts,
    detectedAt: new Date(),
    status: "open",
    severity: "high",
    notified: true,
  });
}

/* ============================================================================
 * TOKEN CLEANUP
 * ========================================================================== */
async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  const snapshot = await db.collection("users").get();
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const webTokens = data.fcmTokens?.webTokens || [];

    const valid = webTokens.filter((t: string) => !tokens.includes(t));

    if (valid.length !== webTokens.length) {
      batch.update(doc.ref, {
        "fcmTokens.webTokens": valid,
        "fcmTokens.web": valid[0] || null,
      });
    }
  });

  await batch.commit();
}

/* ============================================================================
 * NOTIFICATION STATS
 * ========================================================================== */
async function updateNotificationStats(
  userIds: string[],
  type: string,
): Promise<void> {
  const batch = db.batch();

  userIds.forEach((uid) => {
    batch.set(
      db.collection("users").doc(uid),
      {
        notificationStats: {
          totalSent: 1,
          lastReceived: new Date(),
          [`${type}Count`]: 1,
        },
      },
      { merge: true },
    );
  });

  await batch.commit();
}

/* ============================================================================
 * CALLABLE FUNCTION (V2)
 * ========================================================================== */
export const sendTestNotification = onCall(async (request) => {
  // ✅ Accept userId from request data for admin users
  const userId = request.data?.userId || request.auth?.uid;

  if (!userId) {
    throw new HttpsError("unauthenticated", "User ID required");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  const token = userDoc.data()?.fcmTokens?.web;

  if (!token) {
    throw new HttpsError("failed-precondition", "No FCM token found");
  }

  await messaging.send({
    token,
    notification: {
      title: "🔐 SentriLock Test Notification",
      body: "This is a test notification from your security system",
    },
    webpush: {
      fcmOptions: { link: "/" },
    },
  });

  return { success: true, message: "Test notification sent" };
});
