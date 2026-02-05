// app/screens/registeredUsers.tsx
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Grid, GridItem } from "@/components/ui/grid";
import { useTheme } from "./_layout";
import { Spinner } from "@/components/ui/spinner";
import {
  Plus,
  Mail,
  Phone,
  Edit,
  Trash2,
  RefreshCw,
  DoorOpen,
} from "lucide-react-native";
import { RegisterModal } from "@/components/registerModal";
import { UserDetailModal } from "@/components/userDetailModal";
import { ScrollView } from "react-native-gesture-handler";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import { AddIcon } from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Divider } from "@/components/ui/divider";
import { Profiles } from "@/_types";
import { useUsers } from "@/context/usersContext";
import { useRooms, Room } from "@/context/roomsContext";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { AdminGuard } from "@/components/AdminGuard";

// Helper function to format room names for display
const formatRoomName = (roomId: string): string => {
  // Convert roomId to a readable format
  // Examples:
  // "room1" -> "Room 1"
  // "living_room" -> "Living Room"
  // "bedroom1" -> "Bedroom 1"
  // "office" -> "Office"
  return roomId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/(\d+)/g, " $1")
    .trim();
};

// Helper function to get authorized rooms from user data
// This works by scanning the user object for boolean fields that represent rooms
const getAuthorizedRooms = (
  user: Profiles,
  availableRooms: Room[],
): string[] => {
  const authorizedRooms: string[] = [];

  // Fields to exclude from room detection (these are known user fields, not rooms)
  const excludedFields = [
    "id",
    "embedding",
    "name",
    "email",
    "phone",
    "imageUrl",
    "imagePath",
    "registeredAt",
    "updatedAt",
    "status",
  ];

  // If we have rooms from API, use those
  if (availableRooms && availableRooms.length > 0) {
    availableRooms.forEach((room) => {
      const roomField = user[room.id as keyof Profiles];
      if (roomField === true) {
        authorizedRooms.push(room.id);
      }
    });
  } else {
    // Fallback: scan user object for boolean fields that could be rooms
    Object.keys(user).forEach((key) => {
      // Check if it's a boolean field and not in excluded list
      if (
        !excludedFields.includes(key) &&
        typeof user[key as keyof Profiles] === "boolean"
      ) {
        // Only add if the value is true
        if (user[key as keyof Profiles] === true) {
          authorizedRooms.push(key);
        }
      }
    });
  }

  return authorizedRooms;
};

export default function UsersScreen() {
  const { isDark } = useTheme();
  const { profiles, loading: usersLoading, refreshProfiles } = useUsers();
  const { rooms, loading: roomsLoading } = useRooms();

  const dimensions = useWindowDimensions();

  // Responsive breakpoints
  const isMobile = dimensions.width < 768;
  const isDesktop = dimensions.width >= 768;

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profiles | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loading = usersLoading || roomsLoading;

  const theme = {
    background: isDark ? "#000" : "#fff",
    cardBg: isDark ? "#1a1a1a" : "#f8f9fa",
    cardBgHover: isDark ? "#252525" : "#ffffff",
    text: isDark ? "#fff" : "#1a1a1a",
    textSecondary: isDark ? "#a0a0a0" : "#6b7280",
    textMuted: isDark ? "#707070" : "#9ca3af",
    border: isDark ? "#2a2a2a" : "#e5e7eb",
    accent: isDark ? "#3b82f6" : "#2563eb",
    accentLight: isDark ? "#1e3a8a" : "#dbeafe",
    success: isDark ? "#10b981" : "#059669",
    successLight: isDark ? "#064e3b" : "#d1fae5",
    error: isDark ? "#ef4444" : "#dc2626",
  };

  const handleRefresh = () => {
    refreshProfiles();
  };

  const handleRegistrationSuccess = () => {
    refreshProfiles();
  };

  const handleCardPress = (user: Profiles) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const handleEditUser = (user: Profiles) => {
    console.log("Edit user:", user);
    // TODO: Implement edit functionality
    // You can open an edit modal here
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to delete this user? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingUserId(userId);

              // Delete from Firestore
              await deleteDoc(doc(db, "known_persons", userId));

              // Close modal if the deleted user is currently selected
              if (selectedUser?.id === userId) {
                setShowUserDetail(false);
                setSelectedUser(null);
              }

              Alert.alert("Success", "User deleted successfully");
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : "Failed to delete user";
              console.error("❌ Error deleting user:", err);
              Alert.alert("Error", errorMessage);
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ],
    );
  };

  // Loading state
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Spinner size="large" color={theme.accent} />
        <Text style={{ color: theme.textMuted, marginTop: 16 }}>
          Loading users...
        </Text>
      </View>
    );
  }

  return (
    <AdminGuard>
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: theme.background,
        }}
        contentContainerStyle={{
          padding: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ marginBottom: 24 }}>
          <HStack space="md" style={{ alignItems: "center", marginBottom: 8 }}>
            <Heading size="2xl" style={{ color: theme.text, flex: 1 }}>
              Registered Users
            </Heading>
          </HStack>
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
            {profiles?.length || 0} {profiles?.length === 1 ? "user" : "users"}{" "}
            registered
          </Text>
        </View>

        {!profiles || profiles.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 80,
            }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: theme.accentLight,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Plus size={48} color={theme.accent} />
            </View>
            <Heading size="lg" style={{ color: theme.text, marginBottom: 8 }}>
              No users registered yet
            </Heading>
            <Text
              style={{
                color: theme.textMuted,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Get started by registering your first user
            </Text>
            <Button
              size="lg"
              onPress={() => setShowRegisterModal(true)}
              style={{ backgroundColor: theme.accent }}
            >
              <ButtonIcon as={Plus} />
              <ButtonText>Register First User</ButtonText>
            </Button>
          </View>
        ) : (
          <Grid
            className="gap-4"
            _extra={{
              className: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            }}
          >
            {profiles.map((user) => {
              const authorizedRooms = getAuthorizedRooms(user, rooms);

              return (
                <GridItem
                  key={user.id}
                  _extra={{
                    className: "col-span-1",
                  }}
                >
                  <Pressable
                    onPress={() => (isMobile ? null : handleCardPress(user))}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Card
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        borderWidth: 2,
                        borderRadius: 16,
                        overflow: "hidden",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                        opacity: deletingUserId === user.id ? 0.5 : 1,
                      }}
                    >
                      {/* Image Section with Overlay */}
                      <View
                        style={{
                          borderWidth: 0,
                          borderColor: "red",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={{ uri: user.imageUrl }}
                          alt={user.name}
                          size="2xl"
                        />

                        {/* Gradient Overlay */}
                        <View
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 80,
                            background: isDark
                              ? "linear-gradient(to top, rgba(0,0,0,0.8), transparent)"
                              : "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
                          }}
                        />

                        {/* Deleting Indicator */}
                        {deletingUserId === user.id && (
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: "rgba(0,0,0,0.5)",
                            }}
                          >
                            <Spinner size="large" color="#fff" />
                          </View>
                        )}
                      </View>

                      {/* Content Section */}
                      <View style={{ padding: 16 }}>
                        {/* Name */}
                        <Heading
                          size="lg"
                          style={{
                            color: theme.text,
                            marginBottom: 12,
                            fontWeight: "600",
                          }}
                        >
                          {user.name}
                        </Heading>

                        <Divider
                          style={{
                            marginBottom: 12,
                            backgroundColor: theme.border,
                          }}
                        />

                        {/* Contact Info */}
                        <VStack space="sm">
                          {/* Email */}
                          <TouchableOpacity>
                            <HStack space="sm" style={{ alignItems: "center" }}>
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: theme.accentLight,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Mail size={16} color={theme.accent} />
                              </View>
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 14,
                                  flex: 1,
                                }}
                                numberOfLines={1}
                              >
                                {user.email}
                              </Text>
                            </HStack>
                          </TouchableOpacity>

                          {/* Phone */}
                          <TouchableOpacity>
                            <HStack space="sm" style={{ alignItems: "center" }}>
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: theme.accentLight,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Phone size={16} color={theme.accent} />
                              </View>
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 14,
                                }}
                              >
                                {user.phone}
                              </Text>
                            </HStack>
                          </TouchableOpacity>

                          {/* Authorized Rooms */}
                          {authorizedRooms.length > 0 && (
                            <>
                              <Divider
                                style={{
                                  marginVertical: 8,
                                  backgroundColor: theme.border,
                                }}
                              />
                              <View>
                                <HStack
                                  space="sm"
                                  style={{
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: theme.successLight,
                                      justifyContent: "center",
                                      alignItems: "center",
                                    }}
                                  >
                                    <DoorOpen size={16} color={theme.success} />
                                  </View>
                                  <Text
                                    style={{
                                      color: theme.text,
                                      fontSize: 14,
                                      fontWeight: "600",
                                    }}
                                  >
                                    Authorized Rooms
                                  </Text>
                                </HStack>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 6,
                                    marginLeft: 40,
                                  }}
                                >
                                  {authorizedRooms.map((roomId, index) => (
                                    <View
                                      key={index}
                                      style={{
                                        backgroundColor: theme.successLight,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: theme.success + "40",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: theme.success,
                                          fontSize: 12,
                                          fontWeight: "500",
                                        }}
                                      >
                                        {formatRoomName(roomId)}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </>
                          )}

                          {/* No Rooms Authorized */}
                          {authorizedRooms.length === 0 && (
                            <>
                              <Divider
                                style={{
                                  marginVertical: 8,
                                  backgroundColor: theme.border,
                                }}
                              />
                              <HStack
                                space="sm"
                                style={{ alignItems: "center" }}
                              >
                                <View
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: theme.error + "20",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <DoorOpen size={16} color={theme.error} />
                                </View>
                                <Text
                                  style={{
                                    color: theme.textMuted,
                                    fontSize: 13,
                                    fontStyle: "italic",
                                  }}
                                >
                                  No room access
                                </Text>
                              </HStack>
                            </>
                          )}
                        </VStack>
                      </View>
                    </Card>
                  </Pressable>
                </GridItem>
              );
            })}
          </Grid>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {isMobile ? null : (
        <Fab
          size="md"
          placement="bottom right"
          onPress={() => setShowRegisterModal(true)}
          style={{
            backgroundColor: theme.accent,
          }}
        >
          <FabIcon as={AddIcon} color="#fff" />
          <FabLabel style={{ color: "#fff" }}>Register</FabLabel>
        </Fab>
      )}

      {/* Register Modal */}
      <RegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        visible={showUserDetail}
        onClose={() => {
          setShowUserDetail(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />
    </AdminGuard>
  );
}
