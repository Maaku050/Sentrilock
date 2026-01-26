// app/screens/registeredUsers.tsx
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import React, { useState, useEffect, useCallback } from "react";
import { View, TouchableOpacity, Pressable, Alert } from "react-native";
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

// Replace with your actual cloud function URL
const API_BASE_URL = "https://esp32cam-b5bx42kifq-uc.a.run.app";

interface ApiResponse {
  status: "success" | "error";
  count?: number;
  persons?: Profiles[];
  message?: string;
  error?: string;
}

export default function UsersScreen() {
  const { isDark } = useTheme();
  const [profiles, setProfiles] = useState<Profiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profiles | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
    error: isDark ? "#ef4444" : "#dc2626",
  };

  // Fetch users from API
  const fetchUsers = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_BASE_URL}/persons`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.status === "success" && data.persons) {
        setProfiles(data.persons);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load users";
      setError(errorMessage);
      console.error("❌ Error fetching users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    fetchUsers(true);
  };

  const handleRegistrationSuccess = () => {
    fetchUsers(true);
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

              const response = await fetch(
                `${API_BASE_URL}/persons/${userId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data: ApiResponse = await response.json();

              if (data.status === "success") {
                // Close modal if the deleted user is currently selected
                if (selectedUser?.id === userId) {
                  setShowUserDetail(false);
                  setSelectedUser(null);
                }
                // Refresh the list
                await fetchUsers(true);
                Alert.alert("Success", "User deleted successfully");
              } else {
                throw new Error(data.message || "Failed to delete user");
              }
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

  // Error state
  if (error && !profiles.length) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
          padding: 20,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.error + "20",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 32 }}>⚠️</Text>
        </View>
        <Heading size="lg" style={{ color: theme.text, marginBottom: 8 }}>
          Failed to Load Users
        </Heading>
        <Text
          style={{
            color: theme.textMuted,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {error}
        </Text>
        <Button
          size="lg"
          onPress={handleRefresh}
          style={{ backgroundColor: theme.accent }}
        >
          <ButtonIcon as={RefreshCw} />
          <ButtonText>Try Again</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <>
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
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: theme.cardBg,
              }}
            >
              {refreshing ? (
                <Spinner size="small" color={theme.accent} />
              ) : (
                <RefreshCw size={20} color={theme.accent} />
              )}
            </TouchableOpacity>
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
            {profiles.map((user) => (
              <GridItem
                key={user.id}
                _extra={{
                  className: "col-span-1",
                }}
              >
                <Pressable
                  onPress={() => handleCardPress(user)}
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
                      </VStack>
                    </View>
                  </Card>
                </Pressable>
              </GridItem>
            ))}
          </Grid>
        )}
      </ScrollView>

      {/* Floating Action Button */}
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
    </>
  );
}
