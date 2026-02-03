// components/SecurityAlertBanner.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { AlertTriangle, X, Eye, Shield } from "lucide-react-native";
import { useUnauthorizedAttemptDetection } from "@/hooks/useUnauthorizedAttemptDetection";
import { LinearGradient } from "expo-linear-gradient";

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
  const [glowAnim] = useState(new Animated.Value(0));

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#e5e5e5" : "#374151",
    danger: "#ef4444",
    dangerDark: "#dc2626",
    dangerBg: isDark ? "#ef444415" : "#fef2f2",
    border: isDark ? "#ef444440" : "#fecaca",
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

      // Pulsing animation for icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

      // Glow animation
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      glowAnimation.start();

      return () => {
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [lastDetection]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
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
    a.timestamp.toDate().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  );

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Animated glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            opacity: glowOpacity,
            backgroundColor: theme.danger,
          },
        ]}
      />

      <View
        style={[
          styles.innerContainer,
          {
            backgroundColor: theme.dangerBg,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: theme.danger }]} />

        <View style={styles.content}>
          {/* Alert Icon with animated background */}
          <View style={styles.iconWrapper}>
            <Animated.View
              style={[
                styles.iconBackground,
                {
                  backgroundColor: theme.danger + "20",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <AlertTriangle size={26} color={theme.danger} strokeWidth={2.5} />
            </Animated.View>
          </View>

          {/* Alert Content */}
          <View style={styles.textContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.danger }]}>
                  SECURITY ALERT
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={styles.badgeText}>CRITICAL</Text>
                </View>
              </View>
            </View>

            {/* Main Message */}
            <Text style={[styles.message, { color: theme.text }]}>
              Multiple unauthorized access attempts detected
            </Text>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Location
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {lastDetection.roomId}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Attempts
                </Text>
                <Text style={[styles.detailValue, { color: theme.danger }]}>
                  {lastDetection.attempts.length}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Last Attempt
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {lastDetection.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.timeline}>
              <Text style={[styles.timelineLabel, { color: theme.textSecondary }]}>
                Attempt Timeline
              </Text>
              <View style={styles.timelineDots}>
                {attemptTimes.map((time, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                      {time}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: theme.danger }]}
              onPress={handleViewDetails}
              activeOpacity={0.8}
            >
              <Eye size={18} color="#fff" strokeWidth={2.5} />
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.background }]} 
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <X size={20} color={theme.danger} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer - Monitoring Status */}
        {isMonitoring && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Shield size={14} color="#10b981" strokeWidth={2.5} />
            <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Real-time security monitoring active
            </Text>
          </View>
        )}
      </View>
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
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.3,
  },
  innerContainer: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  content: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
  },
  iconWrapper: {
    paddingTop: 2,
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ef444430",
  },
  textContainer: {
    flex: 1,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  timeline: {
    gap: 8,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  timelineDots: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    gap: 8,
    paddingTop: 2,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ef444430",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});