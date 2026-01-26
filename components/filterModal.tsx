// components/filterModal.tsx
import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Divider } from "@/components/ui/divider";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { Calendar, MapPin, Activity } from "lucide-react-native";
import DateTimePicker from "@/components/DateTimePicker"; // Your custom component
import { FilterOptions } from "@/app/screens/dashboard";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  availableRooms: string[];
  availableActions: string[];
  isDark: boolean;
}

export function FilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  availableRooms,
  availableActions,
  isDark,
}: FilterModalProps) {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(currentFilters);

  const theme = {
    background: isDark ? "#000" : "#fff",
    cardBg: isDark ? "#1a1a1a" : "#f8f9fa",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#333",
    textMuted: isDark ? "#888" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    accent: isDark ? "#3b82f6" : "#2563eb",
    accentLight: isDark ? "#1e3a8a" : "#dbeafe",
  };

  // Reset temp filters when modal opens
  useEffect(() => {
    if (visible) {
      setTempFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const formatAction = (action: string) =>
    action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const handleRoomToggle = (roomId: string) => {
    setTempFilters((prev) => ({
      ...prev,
      rooms: prev.rooms.includes(roomId)
        ? prev.rooms.filter((id) => id !== roomId)
        : [...prev.rooms, roomId],
    }));
  };

  const handleActionToggle = (action: string) => {
    setTempFilters((prev) => ({
      ...prev,
      actions: prev.actions.includes(action)
        ? prev.actions.filter((a) => a !== action)
        : [...prev.actions, action],
    }));
  };

  const handleStartDateChange = (date: Date | null) => {
    setTempFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        startDate: date,
      },
    }));
  };

  const handleEndDateChange = (date: Date | null) => {
    setTempFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        endDate: date,
      },
    }));
  };

  const handleClearAll = () => {
    setTempFilters({
      dateRange: {
        startDate: null,
        endDate: null,
      },
      rooms: [],
      actions: [],
    });
  };

  const handleApply = () => {
    onApply(tempFilters);
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

  return (
    <Modal isOpen={visible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent
        style={{
          backgroundColor: theme.background,
          maxHeight: "90%",
        }}
      >
        <ModalHeader
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Heading size="lg" style={{ color: theme.text }}>
            Filter Activity Logs
          </Heading>
        </ModalHeader>

        <ModalBody>
          <ScrollView showsVerticalScrollIndicator={false}>
            <VStack space="lg">
              {/* Date Range Section */}
              <View>
                <HStack
                  space="sm"
                  style={{ alignItems: "center", marginBottom: 12 }}
                >
                  <Calendar size={20} color={theme.accent} />
                  <Heading size="sm" style={{ color: theme.text }}>
                    Date Range
                  </Heading>
                </HStack>

                <VStack space="md">
                  {/* Start Date */}
                  <View>
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      From
                    </Text>
                    <DateTimePicker
                      value={tempFilters.dateRange.startDate}
                      onChange={handleStartDateChange}
                      placeholder="Select start date"
                    />
                    {tempFilters.dateRange.startDate && (
                      <TouchableOpacity
                        onPress={() => handleStartDateChange(null)}
                        style={{ marginTop: 6 }}
                      >
                        <Text style={{ color: theme.accent, fontSize: 12 }}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* End Date */}
                  <View>
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      To
                    </Text>
                    <DateTimePicker
                      value={tempFilters.dateRange.endDate}
                      onChange={handleEndDateChange}
                      placeholder="Select end date"
                    />
                    {tempFilters.dateRange.endDate && (
                      <TouchableOpacity
                        onPress={() => handleEndDateChange(null)}
                        style={{ marginTop: 6 }}
                      >
                        <Text style={{ color: theme.accent, fontSize: 12 }}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </VStack>
              </View>

              <Divider style={{ backgroundColor: theme.border }} />

              {/* Rooms Section */}
              <View>
                <HStack
                  space="sm"
                  style={{ alignItems: "center", marginBottom: 12 }}
                >
                  <MapPin size={20} color={theme.accent} />
                  <Heading size="sm" style={{ color: theme.text }}>
                    Rooms
                  </Heading>
                  {tempFilters.rooms.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.accent,
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {tempFilters.rooms.length}
                      </Text>
                    </View>
                  )}
                </HStack>

                <VStack space="sm">
                  {availableRooms.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                      No rooms available
                    </Text>
                  ) : (
                    availableRooms.map((roomId) => (
                      <Checkbox
                        key={roomId}
                        value={roomId}
                        isChecked={tempFilters.rooms.includes(roomId)}
                        onChange={() => handleRoomToggle(roomId)}
                        style={{
                          padding: 10,
                          backgroundColor: tempFilters.rooms.includes(roomId)
                            ? theme.accentLight
                            : theme.cardBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: tempFilters.rooms.includes(roomId)
                            ? theme.accent
                            : theme.border,
                        }}
                      >
                        <CheckboxIndicator>
                          <CheckboxIcon as={CheckIcon} />
                        </CheckboxIndicator>
                        <CheckboxLabel>
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 14,
                              marginLeft: 8,
                            }}
                          >
                            {roomId}
                          </Text>
                        </CheckboxLabel>
                      </Checkbox>
                    ))
                  )}
                </VStack>
              </View>

              <Divider style={{ backgroundColor: theme.border }} />

              {/* Actions Section */}
              <View>
                <HStack
                  space="sm"
                  style={{ alignItems: "center", marginBottom: 12 }}
                >
                  <Activity size={20} color={theme.accent} />
                  <Heading size="sm" style={{ color: theme.text }}>
                    Actions
                  </Heading>
                  {tempFilters.actions.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.accent,
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {tempFilters.actions.length}
                      </Text>
                    </View>
                  )}
                </HStack>

                <VStack space="sm">
                  {availableActions.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                      No actions available
                    </Text>
                  ) : (
                    availableActions.map((action) => {
                      const actionColors = getActionBadgeColor(action);
                      return (
                        <Checkbox
                          key={action}
                          value={action}
                          isChecked={tempFilters.actions.includes(action)}
                          onChange={() => handleActionToggle(action)}
                          style={{
                            padding: 10,
                            backgroundColor: tempFilters.actions.includes(
                              action,
                            )
                              ? theme.accentLight
                              : theme.cardBg,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: tempFilters.actions.includes(action)
                              ? theme.accent
                              : theme.border,
                          }}
                        >
                          <CheckboxIndicator>
                            <CheckboxIcon as={CheckIcon} />
                          </CheckboxIndicator>
                          <CheckboxLabel style={{ flex: 1 }}>
                            <HStack
                              space="sm"
                              style={{ alignItems: "center", marginLeft: 8 }}
                            >
                              <View
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  backgroundColor: actionColors.bg,
                                  borderRadius: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    color: actionColors.text,
                                    fontSize: 12,
                                    fontWeight: "600",
                                  }}
                                >
                                  {formatAction(action)}
                                </Text>
                              </View>
                            </HStack>
                          </CheckboxLabel>
                        </Checkbox>
                      );
                    })
                  )}
                </VStack>
              </View>
            </VStack>
          </ScrollView>
        </ModalBody>

        <ModalFooter
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <HStack space="md" style={{ width: "100%" }}>
            <Button
              variant="outline"
              onPress={handleClearAll}
              style={{
                flex: 1,
                borderColor: theme.border,
              }}
            >
              <ButtonText style={{ color: theme.text }}>Clear All</ButtonText>
            </Button>
            <Button
              variant="outline"
              onPress={onClose}
              style={{
                flex: 1,
                borderColor: theme.border,
              }}
            >
              <ButtonText style={{ color: theme.text }}>Cancel</ButtonText>
            </Button>
            <Button
              onPress={handleApply}
              style={{
                flex: 1,
                backgroundColor: theme.accent,
              }}
            >
              <ButtonText>Apply Filters</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
