// app/screens/bulkDeleteLogs.tsx
import React, { useState, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "./_layout";
import { useLogs } from "@/context/dashboardContext";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  Trash2,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react-native";
import { AdminGuard } from "@/components/AdminGuard";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import DateTimePicker from "@/components/DateTimePicker";

type DeleteMode =
  | "olderThan"
  | "dateRange"
  | "specificDate"
  | "byAction"
  | "byRoom";

interface DeleteStats {
  totalLogs: number;
  matchingLogs: number;
  byAction: Record<string, number>;
  byRoom: Record<string, number>;
  dateRange: { oldest: Date | null; newest: Date | null };
}

export default function BulkDeleteLogsScreen() {
  const { logs, rooms } = useLogs();
  const { isDark } = useTheme();

  // State
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("olderThan");
  const [daysOld, setDaysOld] = useState("30");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const theme = {
    background: isDark ? "#000" : "#fff",
    cardBg: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#333",
    textMuted: isDark ? "#888" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1a1a1a" : "#f5f5f5",
    accent: "#3b82f6",
    danger: "#ef4444",
    success: "#10b981",
    warning: "#f59e0b",
  };

  // Available actions and rooms
  const availableActions = useMemo(() => {
    const actions = new Set(
      logs.filter((log) => log?.action).map((log) => log.action),
    );
    return Array.from(actions);
  }, [logs]);

  const availableRooms = useMemo(() => {
    return rooms.map((room) => room.id);
  }, [rooms]);

  // Calculate what would be deleted
  const deleteStats: DeleteStats = useMemo(() => {
    let filtered = [...logs];

    // Apply filters based on mode
    if (deleteMode === "olderThan" && daysOld) {
      const days = parseInt(daysOld);
      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filtered = filtered.filter(
          (log) => log?.timestamp && log.timestamp.toDate() < cutoffDate,
        );
      }
    } else if (deleteMode === "dateRange" && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((log) => {
        if (!log?.timestamp) return false;
        const logDate = log.timestamp.toDate();
        return logDate >= start && logDate <= end;
      });
    } else if (deleteMode === "specificDate" && specificDate) {
      const target = new Date(specificDate);
      target.setHours(0, 0, 0, 0);
      const targetEnd = new Date(specificDate);
      targetEnd.setHours(23, 59, 59, 999);

      filtered = filtered.filter((log) => {
        if (!log?.timestamp) return false;
        const logDate = log.timestamp.toDate();
        return logDate >= target && logDate <= targetEnd;
      });
    } else if (deleteMode === "byAction" && selectedActions.length > 0) {
      filtered = filtered.filter(
        (log) => log?.action && selectedActions.includes(log.action),
      );
    } else if (deleteMode === "byRoom" && selectedRooms.length > 0) {
      filtered = filtered.filter(
        (log) => log?.roomId && selectedRooms.includes(log.roomId),
      );
    }

    // Calculate statistics
    const byAction: Record<string, number> = {};
    const byRoom: Record<string, number> = {};
    let oldest: Date | null = null;
    let newest: Date | null = null;

    filtered.forEach((log) => {
      // Count by action
      if (log.action) {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      }

      // Count by room
      if (log.roomId) {
        byRoom[log.roomId] = (byRoom[log.roomId] || 0) + 1;
      }

      // Track date range
      if (log.timestamp) {
        const date = log.timestamp.toDate();
        if (!oldest || date < oldest) oldest = date;
        if (!newest || date > newest) newest = date;
      }
    });

    return {
      totalLogs: logs.length,
      matchingLogs: filtered.length,
      byAction,
      byRoom,
      dateRange: { oldest, newest },
    };
  }, [
    logs,
    deleteMode,
    daysOld,
    startDate,
    endDate,
    specificDate,
    selectedActions,
    selectedRooms,
  ]);

  const handleBulkDelete = async () => {
    if (deleteStats.matchingLogs === 0) {
      Alert.alert("No Logs", "No logs match the current criteria.");
      return;
    }

    setIsDeleting(true);
    try {
      await performBulkDelete();
      Alert.alert(
        "Success",
        `Successfully deleted ${deleteStats.matchingLogs} log entries.`,
      );
    } catch (error) {
      console.error("Error deleting logs:", error);
      Alert.alert("Error", "Failed to delete logs. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const performBulkDelete = async () => {
    let q = query(collection(db, "logs"));

    // Build query based on mode
    if (deleteMode === "olderThan" && daysOld) {
      const days = parseInt(daysOld);
      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
        q = query(q, where("timestamp", "<", cutoffTimestamp));
      }
    } else if (deleteMode === "dateRange" && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const startTimestamp = Timestamp.fromDate(start);
      const endTimestamp = Timestamp.fromDate(end);
      q = query(
        q,
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
      );
    } else if (deleteMode === "specificDate" && specificDate) {
      const target = new Date(specificDate);
      target.setHours(0, 0, 0, 0);
      const targetEnd = new Date(specificDate);
      targetEnd.setHours(23, 59, 59, 999);
      const startTimestamp = Timestamp.fromDate(target);
      const endTimestamp = Timestamp.fromDate(targetEnd);
      q = query(
        q,
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
      );
    }

    // Fetch documents
    const querySnapshot = await getDocs(q);
    let docsToDelete = querySnapshot.docs;

    // Apply additional filters in memory
    if (deleteMode === "byAction" && selectedActions.length > 0) {
      docsToDelete = docsToDelete.filter((doc) =>
        selectedActions.includes(doc.data().action),
      );
    }

    if (deleteMode === "byRoom" && selectedRooms.length > 0) {
      docsToDelete = docsToDelete.filter((doc) =>
        selectedRooms.includes(doc.data().roomId),
      );
    }

    // Delete in batches
    const batchSize = 500;
    for (let i = 0; i < docsToDelete.length; i += batchSize) {
      const batch = docsToDelete.slice(i, i + batchSize);
      const deletePromises = batch.map((docSnap) =>
        deleteDoc(doc(db, "logs", docSnap.id)),
      );
      await Promise.all(deletePromises);
    }
  };

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  };

  const toggleRoom = (room: string) => {
    setSelectedRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room],
    );
  };

  const formatAction = (action: string) =>
    action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <AdminGuard>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.content}>
          {/* Header */}
          <VStack space="md" style={styles.header}>
            <HStack space="sm" style={{ alignItems: "center" }}>
              <Trash2 size={28} color={theme.danger} />
              <Text style={[styles.title, { color: theme.text }]}>
                Bulk Delete Logs
              </Text>
            </HStack>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Permanently delete log entries based on specific criteria
            </Text>
          </VStack>

          {/* Warning Banner */}
          <View
            style={[
              styles.warningBanner,
              {
                backgroundColor: theme.danger + "20",
                borderColor: theme.danger,
              },
            ]}
          >
            <AlertTriangle size={20} color={theme.danger} />
            <Text
              style={[
                styles.warningText,
                { color: theme.danger, marginLeft: 8 },
              ]}
            >
              Warning: Deleted logs cannot be recovered
            </Text>
          </View>

          {/* Delete Mode Selection */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Deletion Criteria
            </Text>

            <VStack space="sm">
              {/* Older Than Days */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  {
                    backgroundColor:
                      deleteMode === "olderThan"
                        ? theme.accent + "20"
                        : "transparent",
                    borderColor:
                      deleteMode === "olderThan" ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setDeleteMode("olderThan")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>
                    Delete logs older than
                  </Text>
                  {deleteMode === "olderThan" && (
                    <HStack space="sm" style={{ marginTop: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.daysButton,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setDaysOld("7")}
                      >
                        <Text
                          style={{
                            color:
                              daysOld === "7" ? theme.accent : theme.textMuted,
                            fontWeight: daysOld === "7" ? "600" : "400",
                          }}
                        >
                          7 days
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.daysButton,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setDaysOld("30")}
                      >
                        <Text
                          style={{
                            color:
                              daysOld === "30" ? theme.accent : theme.textMuted,
                            fontWeight: daysOld === "30" ? "600" : "400",
                          }}
                        >
                          30 days
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.daysButton,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setDaysOld("90")}
                      >
                        <Text
                          style={{
                            color:
                              daysOld === "90" ? theme.accent : theme.textMuted,
                            fontWeight: daysOld === "90" ? "600" : "400",
                          }}
                        >
                          90 days
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  )}
                </View>
                {deleteMode === "olderThan" && (
                  <CheckCircle size={20} color={theme.accent} />
                )}
              </TouchableOpacity>

              {/* Date Range */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  {
                    backgroundColor:
                      deleteMode === "dateRange"
                        ? theme.accent + "20"
                        : "transparent",
                    borderColor:
                      deleteMode === "dateRange" ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setDeleteMode("dateRange")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>
                    Delete logs within date range
                  </Text>
                  {deleteMode === "dateRange" && (
                    <VStack space="xs" style={{ marginTop: 8 }}>
                      <DateTimePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Select start date"
                      />
                      <DateTimePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Select end date"
                      />
                    </VStack>
                  )}
                </View>
                {deleteMode === "dateRange" && (
                  <CheckCircle size={20} color={theme.accent} />
                )}
              </TouchableOpacity>

              {/* Specific Date */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  {
                    backgroundColor:
                      deleteMode === "specificDate"
                        ? theme.accent + "20"
                        : "transparent",
                    borderColor:
                      deleteMode === "specificDate"
                        ? theme.accent
                        : theme.border,
                  },
                ]}
                onPress={() => setDeleteMode("specificDate")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>
                    Delete logs from specific date
                  </Text>
                  {deleteMode === "specificDate" && (
                    <DateTimePicker
                      value={specificDate}
                      onChange={setSpecificDate}
                      placeholder="Select date"
                    />
                  )}
                </View>
                {deleteMode === "specificDate" && (
                  <CheckCircle size={20} color={theme.accent} />
                )}
              </TouchableOpacity>

              {/* By Action */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  {
                    backgroundColor:
                      deleteMode === "byAction"
                        ? theme.accent + "20"
                        : "transparent",
                    borderColor:
                      deleteMode === "byAction" ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setDeleteMode("byAction")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>
                    Delete logs by action type
                  </Text>
                  {deleteMode === "byAction" && (
                    <View style={styles.chipContainer}>
                      {availableActions.map((action) => (
                        <TouchableOpacity
                          key={action}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedActions.includes(action)
                                ? theme.accent
                                : theme.inputBg,
                              borderColor: selectedActions.includes(action)
                                ? theme.accent
                                : theme.border,
                            },
                          ]}
                          onPress={() => toggleAction(action)}
                        >
                          <Text
                            style={{
                              color: selectedActions.includes(action)
                                ? "#fff"
                                : theme.text,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {formatAction(action)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {deleteMode === "byAction" && (
                  <CheckCircle size={20} color={theme.accent} />
                )}
              </TouchableOpacity>

              {/* By Room */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  {
                    backgroundColor:
                      deleteMode === "byRoom"
                        ? theme.accent + "20"
                        : "transparent",
                    borderColor:
                      deleteMode === "byRoom" ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setDeleteMode("byRoom")}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>
                    Delete logs by room
                  </Text>
                  {deleteMode === "byRoom" && (
                    <View style={styles.chipContainer}>
                      {availableRooms.map((room) => (
                        <TouchableOpacity
                          key={room}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedRooms.includes(room)
                                ? theme.accent
                                : theme.inputBg,
                              borderColor: selectedRooms.includes(room)
                                ? theme.accent
                                : theme.border,
                            },
                          ]}
                          onPress={() => toggleRoom(room)}
                        >
                          <Text
                            style={{
                              color: selectedRooms.includes(room)
                                ? "#fff"
                                : theme.text,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {room}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {deleteMode === "byRoom" && (
                  <CheckCircle size={20} color={theme.accent} />
                )}
              </TouchableOpacity>
            </VStack>
          </View>

          {/* Preview Stats */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Deletion Preview
            </Text>

            <VStack space="md">
              {/* Summary Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {deleteStats.totalLogs}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Total Logs
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.danger }]}>
                    {deleteStats.matchingLogs}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    To Delete
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.success }]}>
                    {deleteStats.totalLogs - deleteStats.matchingLogs}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Remaining
                  </Text>
                </View>
              </View>

              {/* Breakdown by Action */}
              {Object.keys(deleteStats.byAction).length > 0 && (
                <View>
                  <Text
                    style={[
                      styles.breakdownTitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    By Action Type:
                  </Text>
                  {Object.entries(deleteStats.byAction).map(
                    ([action, count]) => (
                      <HStack
                        key={action}
                        space="sm"
                        style={styles.breakdownItem}
                      >
                        <Text style={{ color: theme.textMuted, flex: 1 }}>
                          {formatAction(action)}
                        </Text>
                        <Text style={{ color: theme.text, fontWeight: "600" }}>
                          {count}
                        </Text>
                      </HStack>
                    ),
                  )}
                </View>
              )}

              {/* Breakdown by Room */}
              {Object.keys(deleteStats.byRoom).length > 0 && (
                <View>
                  <Text
                    style={[
                      styles.breakdownTitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    By Room:
                  </Text>
                  {Object.entries(deleteStats.byRoom).map(([room, count]) => (
                    <HStack key={room} space="sm" style={styles.breakdownItem}>
                      <Text style={{ color: theme.textMuted, flex: 1 }}>
                        {room}
                      </Text>
                      <Text style={{ color: theme.text, fontWeight: "600" }}>
                        {count}
                      </Text>
                    </HStack>
                  ))}
                </View>
              )}

              {/* Date Range */}
              {deleteStats.dateRange.oldest && deleteStats.dateRange.newest && (
                <View>
                  <Text
                    style={[
                      styles.breakdownTitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Date Range:
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    {deleteStats.dateRange.oldest.toLocaleDateString()} -{" "}
                    {deleteStats.dateRange.newest.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </VStack>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor:
                  deleteStats.matchingLogs > 0 ? theme.danger : theme.textMuted,
                opacity: isDeleting ? 0.6 : 1,
              },
            ]}
            onPress={handleBulkDelete}
            disabled={deleteStats.matchingLogs === 0 || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Trash2 size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>
                  Delete {deleteStats.matchingLogs} Logs
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  daysButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  breakdownItem: {
    paddingVertical: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
