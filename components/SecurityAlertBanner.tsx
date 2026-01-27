// components/SecurityAlertBanner.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { AlertTriangle, X, Eye } from "lucide-react-native";
import { useUnauthorizedAttemptDetection } from "@/hooks/useUnauthorizedAttemptDetection";

interface SecurityAlertBannerProps {
  isDark?: boolean;
  onViewDetails?: (detection: any) => void;
}

export function SecurityAlertBanner({
  isDark = false,
  onViewDetails,
}: SecurityAlertBannerProps) {
  const { lastDetection, isMonitoring, clearLastDetection } =
    useUnauthorizedAttemptDetection();
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pulseAnim] = useState(new Animated.Value(1));

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    danger: "#ef4444",
    dangerBg: "#ef444420",
  };

  useEffect(() => {
    if (lastDetection) {
      setVisible(true);

      // Slide down animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Pulsing animation for urgency
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [lastDetection]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      clearLastDetection();
    });
  };

  const handleViewDetails = () => {
    if (onViewDetails && lastDetection) {
      onViewDetails(lastDetection);
    }
  };

  if (!visible || !lastDetection) {
    return null;
  }

  const attemptTimes = lastDetection.attempts.map((a) =>
    a.timestamp.toDate().toLocaleTimeString(),
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.dangerBg,
          borderColor: theme.danger,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {/* Alert Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <AlertTriangle size={24} color={theme.danger} />
        </Animated.View>

        {/* Alert Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.danger }]}>
            🚨 SECURITY ALERT
          </Text>
          <Text style={[styles.message, { color: theme.text }]}>
            3 consecutive unauthorized access attempts detected at{" "}
            <Text style={{ fontWeight: "700" }}>{lastDetection.roomId}</Text>
          </Text>
          <Text style={[styles.timestamp, { color: theme.text, opacity: 0.7 }]}>
            Detected at {lastDetection.timestamp.toLocaleTimeString()}
          </Text>
          <Text style={[styles.details, { color: theme.text, opacity: 0.6 }]}>
            Attempts at: {attemptTimes.join(", ")}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.danger }]}
            onPress={handleViewDetails}
          >
            <Eye size={16} color="#fff" />
            <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
            <X size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Monitoring Status Indicator */}
      {isMonitoring && (
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
          <Text
            style={[styles.statusText, { color: theme.text, opacity: 0.6 }]}
          >
            Real-time monitoring active
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    borderBottomWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    paddingTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 2,
  },
  details: {
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontStyle: "italic",
  },
});
