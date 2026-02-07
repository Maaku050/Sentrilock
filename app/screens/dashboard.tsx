// app/screens/dashboard.tsx
import React, { useState, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "./_layout";
import { useLogs } from "@/context/dashboardContext";
import { RoomCard } from "@/components/roomCard";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import {
  Clock,
  MapPin,
  Activity,
  Search,
  Filter,
  X,
  Printer,
} from "lucide-react-native";
import { FilterModal } from "@/components/filterModal";
import { Input, InputField } from "@/components/ui/input";
import NotificationHandler from "@/components/NotificationHandler";
import { SecurityAlertBanner } from "@/components/SecurityAlertBanner";
import Pagination from "@/components/customPagination";
import * as Print from "expo-print";
import { Skeleton } from "@/components/ui/skeleton";

export type FilterOptions = {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  rooms: string[];
  actions: string[];
};

const LOGS_PER_PAGE = 15;

export default function DashboardScreen() {
  const { logs, loading, error, roomsUI, rooms } = useLogs();
  const { isDark } = useTheme();
  const dimensions = useWindowDimensions();

  // Responsive breakpoints
  const isMobile = dimensions.width < 768;
  const isDesktop = dimensions.width >= 768;

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: null,
      endDate: null,
    },
    rooms: [],
    actions: [],
  });
  const [selectedAlertLog, setSelectedAlertLog] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const theme = {
    background: isDark ? "#000" : "#fff",
    cardBg: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#333",
    textMuted: isDark ? "#888" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1a1a1a" : "#f5f5f5",
    accent: isDark ? "#3b82f6" : "#2563eb",
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "authorized_entry":
        return { bg: "#10b98120", text: "#10b981" };
      case "user_leaving":
        return { bg: "#f59e0b20", text: "#f59e0b" };
      case "unauthorized_attempt":
        return { bg: "#ef444420", text: "#ef4444" };
      case "admin_control":
        return { bg: "#3b82f620", text: "#3b82f6" };
      default:
        return { bg: theme.cardBg, text: theme.textMuted };
    }
  };

  const formatAction = (action: string) =>
    action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  // Get unique action types from logs
  const availableActions = useMemo(() => {
    const actions = new Set(
      logs.filter((log) => log?.action).map((log) => log.action),
    );
    return Array.from(actions);
  }, [logs]);

  // Get unique room IDs from rooms
  const availableRooms = useMemo(() => {
    return rooms.map((room) => room.id);
  }, [rooms]);

  // Filter logs based on search query and filters
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log?.user?.name?.toLowerCase().includes(query),
      );
    }

    // Apply date range filter
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      filtered = filtered.filter((log) => {
        if (!log?.timestamp) return false;

        const logDate = log.timestamp.toDate();

        if (filters.dateRange.startDate && filters.dateRange.endDate) {
          const start = new Date(filters.dateRange.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.dateRange.endDate);
          end.setHours(23, 59, 59, 999);

          return logDate >= start && logDate <= end;
        } else if (filters.dateRange.startDate) {
          const start = new Date(filters.dateRange.startDate);
          start.setHours(0, 0, 0, 0);
          return logDate >= start;
        } else if (filters.dateRange.endDate) {
          const end = new Date(filters.dateRange.endDate);
          end.setHours(23, 59, 59, 999);
          return logDate <= end;
        }

        return true;
      });
    }

    // Apply room filter
    if (filters.rooms.length > 0) {
      filtered = filtered.filter(
        (log) => log?.roomId && filters.rooms.includes(log.roomId),
      );
    }

    // Apply action filter
    if (filters.actions.length > 0) {
      filtered = filtered.filter(
        (log) => log?.action && filters.actions.includes(log.action),
      );
    }

    return filtered;
  }, [logs, searchQuery, filters]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
    const endIndex = startIndex + LOGS_PER_PAGE;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredLogs.length]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRange.startDate !== null ||
      filters.dateRange.endDate !== null ||
      filters.rooms.length > 0 ||
      filters.actions.length > 0
    );
  }, [filters]);

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: {
        startDate: null,
        endDate: null,
      },
      rooms: [],
      actions: [],
    });
    setSearchQuery("");
  };

  const handleViewAlertDetails = (detection: any) => {
    console.log("Viewing alert details:", detection);
    // Highlight the logs in the list or open a modal
    if (detection.attempts && detection.attempts.length > 0) {
      setSelectedAlertLog(detection.attempts[0].id);

      // Scroll to the log entry
      setTimeout(() => {
        setSelectedAlertLog(null);
      }, 5000); // Clear highlight after 5 seconds
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrintLogs = async () => {
    try {
      // Generate HTML for the print document
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sentrilock Logs Report</title>

  <style>
    :root {
      --accent: #2563eb;
      --bg-soft: #f8fafc;
      --border: #e5e7eb;
      --text-main: #111827;
      --text-muted: #6b7280;
      --danger: #dc2626;
      --warning: #d97706;
      --success: #047857;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                   Roboto, Inter, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 48px;
      background: #fff;
      color: var(--text-main);
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid var(--accent);
      padding-bottom: 16px;
      margin-bottom: 32px;
    }

    .brand {
      display: flex;
      flex-direction: column;
    }

    .brand h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    .brand span {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .meta {
      text-align: right;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* ===== SUMMARY ===== */
    .summary {
      background: var(--bg-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 13px;
      margin-bottom: 24px;
    }

    .summary strong {
      font-weight: 600;
      color: var(--text-main);
    }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    thead {
      background: var(--bg-soft);
      border-bottom: 2px solid var(--border);
    }

    th {
      text-align: left;
      padding: 12px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }

    td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    /* ===== CELLS ===== */
    .action {
      font-weight: 600;
    }

    .authorized { color: var(--success); }
    .leaving { color: var(--warning); }
    .unauthorized { color: var(--danger); }
    .admin { color: var(--accent); }

    .room {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #eef2ff;
      color: #1e3a8a;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      display: inline-block;
    }

    .no-data {
      text-align: center;
      padding: 48px;
      font-style: italic;
      color: var(--text-muted);
    }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    @media print {
      body {
        padding: 32px;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  </style>
</head>

<body>
  <div class="header">
    <div class="brand">
      <h1>Sentrilock Logs Report</h1>
      <span>Security Activity & Access Monitoring</span>
    </div>

    <div class="meta">
      Generated on<br/>
      ${new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </div>
  </div>

  <div class="summary">
    <strong>Total Records:</strong> ${filteredLogs.length}
    ${
      searchQuery || hasActiveFilters
        ? `<span style="color: var(--text-muted);">
            (filtered from ${logs.length} total)
           </span>`
        : ""
    }
  </div>

  ${
    filteredLogs.length === 0
      ? `<div class="no-data">No activity logs available</div>`
      : `
  <table>
    <thead>
      <tr>
        <th style="width: 18%">Date & Time</th>
        <th style="width: 26%">Action</th>
        <th style="width: 16%">Room</th>
        <th style="width: 40%">User</th>
      </tr>
    </thead>
    <tbody>
      ${filteredLogs
        .map((log) => {
          const cls =
            log.action === "authorized_entry"
              ? "authorized"
              : log.action === "user_leaving"
                ? "leaving"
                : log.action === "unauthorized_attempt"
                  ? "unauthorized"
                  : log.action === "admin_control"
                    ? "admin"
                    : "";

          const timestamp = log?.timestamp
            ? log.timestamp.toDate().toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "N/A";

          const user =
            !log?.user?.name || log.user.name === "null"
              ? "Unknown User"
              : log.user.name;

          return `
          <tr>
            <td>${timestamp}</td>
            <td class="action ${cls}">${formatAction(log.action)}</td>
            <td><span class="room">${log.roomId}</span></td>
            <td>${user}</td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  </table>
  `
  }

  <div class="footer">
    Sentrilock System • Confidential Security Report
  </div>
</body>
</html>
`;

      // Use expo-print for all platforms
      if (Platform.OS === "web") {
        // For web, open in new window
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      } else {
        // For mobile (iOS/Android), use expo-print
        await Print.printAsync({
          html,
        });
      }
    } catch (error) {
      console.error("Error printing logs:", error);
      // You could add a toast notification here to inform the user
    }
  };

  return (
    <>
      {/* Security Alert Banner - Shows on consecutive unauthorized attempts */}
      <SecurityAlertBanner
        isDark={isDark}
        onViewDetails={handleViewAlertDetails}
      />

      {/* Notification Handler Component */}
      <NotificationHandler />

      {isMobile ? (
        <ScrollView
          style={{ ...styles.container, backgroundColor: theme.background }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Skeleton
              variant="rounded"
              className="h-[250px]"
              style={{ marginBottom: 15 }}
            />
          ) : (
            <View>
              {roomsUI.map((room) => (
                <View key={room.id} style={styles.roomGridItem}>
                  <RoomCard room={room} isDark={isDark} />
                </View>
              ))}
            </View>
          )}

          <ScrollView horizontal>
            <View
              style={[
                styles.logsSection,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  height: 600,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.logHeader}>
                <HStack space="sm" style={{ alignItems: "center" }}>
                  <Activity size={22} color={"#3b82f6"} />
                  <Text style={[styles.logsTitle, { color: theme.text }]}>
                    Activity Logs
                  </Text>
                </HStack>

                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {filteredLogs.length} of {logs.length}{" "}
                  {filteredLogs.length === 1 ? "entry" : "entries"}
                </Text>
              </View>

              {/* Search and Filter Bar */}
              <VStack space="sm" style={{ marginBottom: 12 }}>
                <HStack space="sm" style={{ alignItems: "center" }}>
                  {/* Search Input */}
                  <View style={styles.searchInputContainer}>
                    <Search
                      size={20}
                      color="#6b7280"
                      style={styles.searchIcon}
                    />
                    <Input style={styles.searchInput}>
                      <InputField
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by user name..."
                        placeholderTextColor="#9ca3af"
                      />
                    </Input>
                    {searchQuery && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        style={styles.clearButton}
                      >
                        <X size={18} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Print Button */}
                  <TouchableOpacity
                    onPress={handlePrintLogs}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 12,
                      height: 40,
                      gap: 6,
                    }}
                  >
                    <Printer size={18} color={theme.text} />
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Print
                    </Text>
                  </TouchableOpacity>

                  {/* Filter Button */}
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: hasActiveFilters
                        ? theme.accent
                        : theme.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: hasActiveFilters
                        ? theme.accent
                        : theme.border,
                      paddingHorizontal: 12,
                      height: 40,
                      gap: 6,
                    }}
                  >
                    <Filter
                      size={18}
                      color={hasActiveFilters ? "#fff" : theme.text}
                    />
                    <Text
                      style={{
                        color: hasActiveFilters ? "#fff" : theme.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Filter
                    </Text>
                    {hasActiveFilters && (
                      <View
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {(filters.rooms.length > 0 ? 1 : 0) +
                            (filters.actions.length > 0 ? 1 : 0) +
                            (filters.dateRange.startDate ||
                            filters.dateRange.endDate
                              ? 1
                              : 0)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </HStack>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <HStack
                    space="xs"
                    style={{ alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      Active filters:
                    </Text>

                    {filters.dateRange.startDate && (
                      <View
                        style={{
                          backgroundColor: theme.accent + "20",
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          From:{" "}
                          {filters.dateRange.startDate.toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {filters.dateRange.endDate && (
                      <View
                        style={{
                          backgroundColor: theme.accent + "20",
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          To: {filters.dateRange.endDate.toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {filters.rooms.length > 0 && (
                      <View
                        style={{
                          backgroundColor: theme.accent + "20",
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {filters.rooms.length}{" "}
                          {filters.rooms.length === 1 ? "room" : "rooms"}
                        </Text>
                      </View>
                    )}

                    {filters.actions.length > 0 && (
                      <View
                        style={{
                          backgroundColor: theme.accent + "20",
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {filters.actions.length}{" "}
                          {filters.actions.length === 1 ? "action" : "actions"}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity onPress={handleClearFilters}>
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "600",
                          textDecorationLine: "underline",
                        }}
                      >
                        Clear all
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                )}
              </VStack>

              {/* Logs List */}
              <ScrollView
                style={styles.logsContent}
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" style={{ marginTop: 150 }} />
                ) : null}
                {error && <Text style={{ color: "red" }}>{error}</Text>}

                {!loading && filteredLogs.length === 0 && (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 40,
                    }}
                  >
                    <Activity
                      size={48}
                      color={theme.textMuted}
                      style={{ opacity: 0.3 }}
                    />
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 14,
                        marginTop: 12,
                        textAlign: "center",
                      }}
                    >
                      No logs found
                      {(searchQuery || hasActiveFilters) &&
                        "\nTry adjusting your filters"}
                    </Text>
                  </View>
                )}

                {paginatedLogs.map((log) => {
                  const actionColors = getActionBadgeColor(log.action);
                  const isHighlighted = selectedAlertLog === log.id;

                  return (
                    <View
                      key={log.id}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        backgroundColor: isHighlighted
                          ? "#ef444420"
                          : theme.background,
                        borderRadius: 10,
                        borderWidth: isHighlighted ? 2 : 1,
                        borderColor: isHighlighted ? "#ef4444" : theme.border,
                      }}
                    >
                      {/* Top Row: Action + Room */}
                      <HStack
                        space="sm"
                        style={{ alignItems: "flex-start", marginBottom: 6 }}
                      >
                        {/* Action Badge */}
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            backgroundColor: actionColors.bg,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: actionColors.text,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {formatAction(log.action)}
                          </Text>
                        </View>

                        {/* Room Badge */}
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: theme.cardBg,
                            borderRadius: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <MapPin size={12} color={theme.textMuted} />
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 11,
                              fontWeight: "600",
                            }}
                          >
                            {log.roomId}
                          </Text>
                        </View>
                      </HStack>

                      {/* User */}
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        {log?.user?.name === "null"
                          ? null
                          : log?.user?.name === "Unknown"
                            ? null
                            : log?.user?.name === "Admin"
                              ? null
                              : log?.user?.name}
                      </Text>

                      {/* Timestamp */}
                      <HStack space="xs" style={{ alignItems: "center" }}>
                        <Clock size={14} color={theme.textMuted} />
                        <Text
                          style={{
                            color: theme.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {log?.timestamp
                            ? log.timestamp.toDate().toLocaleString()
                            : "N/A"}
                        </Text>
                      </HStack>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Pagination Component */}
              {!loading && filteredLogs.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <HStack
          style={{ ...styles.container, backgroundColor: theme.background }}
          space="md"
        >
          {loading ? (
            <Skeleton
              variant="rounded"
              className="h-[250px]"
              style={{ flex: 1 }}
            />
          ) : (
            <View style={styles.roomGrid}>
              {roomsUI.map((room) => (
                <View key={room.id} style={styles.roomGridItem}>
                  <RoomCard room={room} isDark={isDark} />
                </View>
              ))}
            </View>
          )}

          <View
            style={[
              styles.logsSection,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.logHeader}>
              <HStack space="sm" style={{ alignItems: "center" }}>
                <Activity size={22} color={"#3b82f6"} />
                <Text style={[styles.logsTitle, { color: theme.text }]}>
                  Activity Logs
                </Text>
              </HStack>

              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                {filteredLogs.length} of {logs.length}{" "}
                {filteredLogs.length === 1 ? "entry" : "entries"}
              </Text>
            </View>

            {/* Search and Filter Bar */}
            <VStack space="sm" style={{ marginBottom: 12 }}>
              <HStack space="sm" style={{ alignItems: "center" }}>
                {/* Search Input */}
                <View style={styles.searchInputContainer}>
                  <Search size={20} color="#6b7280" style={styles.searchIcon} />
                  <Input style={styles.searchInput}>
                    <InputField
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search by user name..."
                      placeholderTextColor="#9ca3af"
                    />
                  </Input>
                  {searchQuery && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      style={styles.clearButton}
                    >
                      <X size={18} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Print Button */}
                <TouchableOpacity
                  onPress={handlePrintLogs}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingHorizontal: 12,
                    height: 40,
                    gap: 6,
                  }}
                >
                  <Printer size={18} color={theme.text} />
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Print
                  </Text>
                </TouchableOpacity>

                {/* Filter Button */}
                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: hasActiveFilters
                      ? theme.accent
                      : theme.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: hasActiveFilters ? theme.accent : theme.border,
                    paddingHorizontal: 12,
                    height: 40,
                    gap: 6,
                  }}
                >
                  <Filter
                    size={18}
                    color={hasActiveFilters ? "#fff" : theme.text}
                  />
                  <Text
                    style={{
                      color: hasActiveFilters ? "#fff" : theme.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Filter
                  </Text>
                  {hasActiveFilters && (
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {(filters.rooms.length > 0 ? 1 : 0) +
                          (filters.actions.length > 0 ? 1 : 0) +
                          (filters.dateRange.startDate ||
                          filters.dateRange.endDate
                            ? 1
                            : 0)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </HStack>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <HStack
                  space="xs"
                  style={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    Active filters:
                  </Text>

                  {filters.dateRange.startDate && (
                    <View
                      style={{
                        backgroundColor: theme.accent + "20",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        From: {filters.dateRange.startDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {filters.dateRange.endDate && (
                    <View
                      style={{
                        backgroundColor: theme.accent + "20",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        To: {filters.dateRange.endDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {filters.rooms.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.accent + "20",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {filters.rooms.length}{" "}
                        {filters.rooms.length === 1 ? "room" : "rooms"}
                      </Text>
                    </View>
                  )}

                  {filters.actions.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.accent + "20",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {filters.actions.length}{" "}
                        {filters.actions.length === 1 ? "action" : "actions"}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={handleClearFilters}>
                    <Text
                      style={{
                        color: theme.accent,
                        fontSize: 11,
                        fontWeight: "600",
                        textDecorationLine: "underline",
                      }}
                    >
                      Clear all
                    </Text>
                  </TouchableOpacity>
                </HStack>
              )}
            </VStack>

            {/* Logs List */}
            <ScrollView
              style={styles.logsContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <ActivityIndicator color="#fff" style={{ marginTop: 150 }} />
              ) : null}
              {error && <Text style={{ color: "red" }}>{error}</Text>}

              {!loading && filteredLogs.length === 0 && (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 40,
                  }}
                >
                  <Activity
                    size={48}
                    color={theme.textMuted}
                    style={{ opacity: 0.3 }}
                  />
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 14,
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    No logs found
                    {(searchQuery || hasActiveFilters) &&
                      "\nTry adjusting your filters"}
                  </Text>
                </View>
              )}

              {paginatedLogs.map((log) => {
                const actionColors = getActionBadgeColor(log.action);
                const isHighlighted = selectedAlertLog === log.id;

                return (
                  <View
                    key={log.id}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: isHighlighted
                        ? "#ef444420"
                        : theme.background,
                      borderRadius: 10,
                      borderWidth: isHighlighted ? 2 : 1,
                      borderColor: isHighlighted ? "#ef4444" : theme.border,
                    }}
                  >
                    {/* Top Row: Action + Room */}
                    <HStack
                      space="sm"
                      style={{ alignItems: "flex-start", marginBottom: 6 }}
                    >
                      {/* Action Badge */}
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          backgroundColor: actionColors.bg,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: actionColors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {formatAction(log.action)}
                        </Text>
                      </View>

                      {/* Room Badge */}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: theme.cardBg,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MapPin size={12} color={theme.textMuted} />
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {log.roomId}
                        </Text>
                      </View>
                    </HStack>

                    {/* User */}
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      {log?.user?.name === "null"
                        ? null
                        : log?.user?.name === "Unknown"
                          ? null
                          : log?.user?.name === "Admin"
                            ? null
                            : log?.user?.name}
                    </Text>

                    {/* Timestamp */}
                    <HStack space="xs" style={{ alignItems: "center" }}>
                      <Clock size={14} color={theme.textMuted} />
                      <Text
                        style={{
                          color: theme.textMuted,
                          fontSize: 12,
                        }}
                      >
                        {log?.timestamp
                          ? log.timestamp.toDate().toLocaleString()
                          : "N/A"}
                      </Text>
                    </HStack>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Component */}
            {!loading && filteredLogs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </View>
        </HStack>
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        availableRooms={availableRooms}
        availableActions={availableActions}
        isDark={isDark}
      />
    </>
  );
}

const styles = StyleSheet.create({
  roomGrid: {
    flex: 1,
  },
  roomGridItem: {
    marginBottom: 10,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  logsSection: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    paddingBottom: 0,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  logsContent: {
    flex: 1,
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -10,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -9,
  },
});
