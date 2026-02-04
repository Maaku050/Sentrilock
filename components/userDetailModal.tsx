// components/userDetailModal.tsx - WITH TIME-BASED ACCESS CONTROL
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { useState, useEffect, useMemo } from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Divider } from "@/components/ui/divider";
import { ScrollView, TouchableOpacity, Alert } from "react-native";
import { View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import {
  Mail,
  Phone,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Activity,
  Camera,
  Lock,
  Unlock,
  Shield,
} from "lucide-react-native";
import { useTheme } from "../app/screens/_layout";
import { Profiles } from "@/_types";
import { Alert as UIAlert, AlertText } from "@/components/ui/alert";
import { useLogs } from "@/context/dashboardContext";
import { Input, InputField } from "@/components/ui/input";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
} from "@/components/ui/form-control";
import { db, storage } from "@/firebase/firebaseConfig";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { collection, getDocs } from "firebase/firestore";

interface UserDetailModalProps {
  visible: boolean;
  onClose: () => void;
  user: Profiles | null;
  onEdit?: (user: Profiles) => void;
  onDelete?: (userId: string) => void;
}

interface Room {
  id: string;
  name: string;
}

export function UserDetailModal({
  visible,
  onClose,
  user,
  onEdit,
  onDelete,
}: UserDetailModalProps) {
  const { isDark } = useTheme();
  const { logs } = useLogs();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());

  // NEW: Store fresh user data
  const [freshUserData, setFreshUserData] = useState<Profiles | null>(null);

  // Helper function to safely convert Firestore Timestamp or Date to Date
  const toDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
    return new Date();
  };

  const handleReset = () => {
    setEmail("");
    setPhone("");
    setIsEditing(false);
  };

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    cardBg: isDark ? "#0a0a0a" : "#f9fafb",
    text: isDark ? "#fff" : "#1a1a1a",
    textSecondary: isDark ? "#a0a0a0" : "#6b7280",
    textMuted: isDark ? "#707070" : "#9ca3af",
    border: isDark ? "#2a2a2a" : "#e5e7eb",
    accent: isDark ? "#3b82f6" : "#2563eb",
    accentLight: isDark ? "#1e3a8a" : "#dbeafe",
    success: isDark ? "#10b981" : "#059669",
    successLight: isDark ? "#064e3b" : "#d1fae5",
    danger: isDark ? "#ef4444" : "#dc2626",
    dangerLight: isDark ? "#7f1d1d" : "#fee2e2",
    warning: isDark ? "#f59e0b" : "#d97706",
    warningLight: isDark ? "#78350f" : "#fef3c7",
  };

  // Fetch fresh user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id || !visible) return;

      try {
        const userDoc = await getDoc(doc(db, "known_persons", user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();

          setFreshUserData({
            id: userDoc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            imageUrl: data.imageUrl,
            registeredDate: toDate(data.registeredDate),
            updatedAt: toDate(data.updatedAt),
            ...data, // Include all other fields including room permissions
          } as Profiles);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user?.id, visible]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const roomsData = roomsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));
        setRooms(roomsData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    if (visible) {
      fetchRooms();
    }
  }, [visible]);

  // Initialize form with user data - USE FRESH DATA
  useEffect(() => {
    const currentUser = freshUserData || user;
    if (currentUser && rooms.length > 0) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
      setImageUri(currentUser.imageUrl || null);
      setStartTime(currentUser.startTime || "");
      setEndTime(currentUser.endTime || "");

      // Initialize room permissions
      const userRooms = new Set<string>();
      rooms.forEach((room) => {
        const roomPermission = currentUser[room.id];
        if (roomPermission === true) {
          userRooms.add(room.id);
        }
      });
      setSelectedRooms(userRooms);
    }
  }, [freshUserData, user, rooms]);

  // Filter logs for this specific user
  const userLogs = useMemo(() => {
    if (!user) return [];
    return logs.filter((log) => log.user.id === user.id);
  }, [logs, user]);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^(\+63|0)?9\d{9}$/.test(phone))
      newErrors.phone = "Invalid phone number format";

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (startTime && !timeRegex.test(startTime)) {
      newErrors.startTime = "Invalid time format (use HH:MM)";
    }

    if (endTime && !timeRegex.test(endTime)) {
      newErrors.endTime = "Invalid time format (use HH:MM)";
    }

    // Both or neither should be set
    if ((startTime && !endTime) || (!startTime && endTime)) {
      newErrors.time =
        "Both start and end times must be set, or leave both empty for 24/7 access";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string, userId: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `known-persons/${userId}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user || !validateInputs()) return;

    try {
      setLoading(true);

      let imageUrl = user.imageUrl;

      if (imageUri && imageUri !== user.imageUrl) {
        imageUrl = await uploadImage(imageUri, user.id);
      }

      // Prepare room permissions update
      const roomPermissions: Record<string, boolean> = {};
      rooms.forEach((room) => {
        roomPermissions[room.id] = selectedRooms.has(room.id);
      });

      const userRef = doc(db, "known_persons", user.id);
      const updateData: any = {
        name,
        email,
        phone,
        imageUrl,
        ...roomPermissions,
        updatedAt: new Date(),
      };

      // Add time-based access fields (or remove them if empty)
      if (startTime && endTime) {
        updateData.startTime = startTime;
        updateData.endTime = endTime;
      } else {
        // Remove time restrictions if both are empty
        updateData.startTime = null;
        updateData.endTime = null;
      }

      await updateDoc(userRef, updateData);

      // Refresh user data
      const updatedDoc = await getDoc(userRef);
      if (updatedDoc.exists()) {
        const data = updatedDoc.data();

        setFreshUserData({
          id: updatedDoc.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          imageUrl: data.imageUrl,
          startTime: data.startTime,
          endTime: data.endTime,
          registeredDate: toDate(data.registeredDate),
          updatedAt: toDate(data.updatedAt),
          ...data,
        } as Profiles);
      }

      handleReset();

      if (onEdit) {
        onEdit({
          ...user,
          name,
          email,
          phone,
          imageUrl,
          startTime,
          endTime,
          ...roomPermissions,
        });
      }

      Alert.alert("Success", "User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const userRef = doc(db, "known_persons", user.id);
      await deleteDoc(userRef);

      Alert.alert("Success", "User deleted successfully");
      setShowDeleteConfirm(false);

      if (onDelete) {
        onDelete(user.id);
      }

      onClose();
    } catch (error) {
      console.error("Error deleting user:", error);
      Alert.alert("Error", "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const currentUser = freshUserData || user;
    if (currentUser && rooms.length > 0) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
      setImageUri(currentUser.imageUrl || null);
      setStartTime(currentUser.startTime || "");
      setEndTime(currentUser.endTime || "");

      const userRooms = new Set<string>();
      rooms.forEach((room) => {
        const roomPermission = currentUser[room.id];
        if (roomPermission === true) {
          userRooms.add(room.id);
        }
      });
      setSelectedRooms(userRooms);
    }
    setIsEditing(false);
    setErrors({});
  };

  const handleClose = () => {
    handleCancel();
    onClose();
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

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const toggleRoom = (roomId: string) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  if (!user) return null;

  // Use fresh data if available
  const displayUser = freshUserData || user;

  return (
    <>
      <Modal isOpen={visible} onClose={handleClose} size="full">
        <ModalBackdrop />
        <ModalContent
          style={{
            backgroundColor: theme.background,
            maxWidth: 1200,
            maxHeight: "90%",
          }}
        >
          <ModalHeader
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              paddingBottom: 5,
            }}
          >
            <Heading size="xl" style={{ color: theme.text }}>
              {isEditing ? "Edit User" : "User Details"}
            </Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} style={{ color: theme.text }} />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody showsHorizontalScrollIndicator={false}>
            <HStack
              space="lg"
              style={{
                flex: 1,
                borderWidth: 0,
                maxHeight: 800,
              }}
            >
              {/* Left Section - User Details */}
              <VStack
                space="lg"
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: theme.cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <HStack space="md" style={{ alignItems: "center" }}>
                  {/* Profile Image */}
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={isEditing ? pickImage : undefined}
                      disabled={true}
                    >
                      <View>
                        <Image
                          source={{
                            uri:
                              imageUri ||
                              "https://via.placeholder.com/200/cccccc/ffffff?text=No+Image",
                          }}
                          alt={name}
                          style={{
                            width: 200,
                            height: 200,
                            borderRadius: 100,
                            borderWidth: 4,
                            borderColor: theme.accent,
                          }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Name */}
                  {!isEditing ? (
                    <View>
                      <Heading
                        size="xl"
                        style={{
                          color: theme.text,
                          textAlign: "center",
                          marginBottom: 4,
                        }}
                      >
                        {displayUser.name}
                      </Heading>
                      <Text
                        style={{
                          color: theme.textMuted,
                          textAlign: "center",
                          fontSize: 12,
                        }}
                      >
                        User ID: {displayUser.id}
                      </Text>
                    </View>
                  ) : (
                    <FormControl isRequired isInvalid={!!errors.name}>
                      <FormControlLabel>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          Full Name
                        </Text>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          value={name}
                          onChangeText={(v) => {
                            setName(v);
                            setErrors((e) => ({ ...e, name: "" }));
                          }}
                          placeholder="Enter full name"
                          style={{ color: theme.text }}
                        />
                      </Input>
                      {errors.name && (
                        <FormControlError>
                          <Text style={{ color: "#ef4444" }}>
                            {errors.name}
                          </Text>
                        </FormControlError>
                      )}
                    </FormControl>
                  )}
                </HStack>

                <Divider style={{ backgroundColor: theme.border }} />

                {/* Contact Information */}
                <VStack space="md">
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 12,
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    Contact Information
                  </Text>

                  {/* Email */}
                  {!isEditing ? (
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.accentLight,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Mail size={20} color={theme.accent} />
                      </View>
                      <VStack style={{ flex: 1 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          Email
                        </Text>
                        <Text style={{ color: theme.text, fontSize: 14 }}>
                          {displayUser.email}
                        </Text>
                      </VStack>
                    </HStack>
                  ) : (
                    <FormControl isRequired isInvalid={!!errors.email}>
                      <FormControlLabel>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          Email
                        </Text>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          value={email}
                          onChangeText={(v) => {
                            setEmail(v);
                            setErrors((e) => ({ ...e, email: "" }));
                          }}
                          placeholder="Enter email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={{ color: theme.text }}
                        />
                      </Input>
                      {errors.email && (
                        <FormControlError>
                          <Text style={{ color: "#ef4444" }}>
                            {errors.email}
                          </Text>
                        </FormControlError>
                      )}
                    </FormControl>
                  )}

                  {/* Phone */}
                  {!isEditing ? (
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.accentLight,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Phone size={20} color={theme.accent} />
                      </View>
                      <VStack style={{ flex: 1 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          Phone
                        </Text>
                        <Text style={{ color: theme.text, fontSize: 14 }}>
                          {displayUser.phone}
                        </Text>
                      </VStack>
                    </HStack>
                  ) : (
                    <FormControl isRequired isInvalid={!!errors.phone}>
                      <FormControlLabel>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          Phone
                        </Text>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          value={phone}
                          onChangeText={(v) => {
                            setPhone(v);
                            setErrors((e) => ({ ...e, phone: "" }));
                          }}
                          placeholder="+639123456789"
                          keyboardType="phone-pad"
                          style={{ color: theme.text }}
                        />
                      </Input>
                      {errors.phone && (
                        <FormControlError>
                          <Text style={{ color: "#ef4444" }}>
                            {errors.phone}
                          </Text>
                        </FormControlError>
                      )}
                    </FormControl>
                  )}
                </VStack>

                {/* TIME-BASED ACCESS CONTROL */}
                <Divider style={{ backgroundColor: theme.border }} />

                {/* View Mode - Time Display */}
                {!isEditing && (
                  <VStack space="md">
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <Clock size={16} color={theme.warning} />
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        Access Hours
                      </Text>
                    </HStack>

                    <View
                      style={{
                        backgroundColor:
                          displayUser.startTime && displayUser.endTime
                            ? theme.warningLight
                            : theme.successLight,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          displayUser.startTime && displayUser.endTime
                            ? theme.warning
                            : theme.success,
                      }}
                    >
                      {displayUser.startTime && displayUser.endTime ? (
                        <VStack space="xs">
                          <Text
                            style={{
                              color: theme.warning,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            🕒 Time-Restricted Access
                          </Text>
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 14,
                            }}
                          >
                            {displayUser.startTime} - {displayUser.endTime}
                          </Text>
                        </VStack>
                      ) : (
                        <VStack space="xs">
                          <Text
                            style={{
                              color: theme.success,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            ✓ 24/7 Access
                          </Text>
                          <Text
                            style={{
                              color: theme.textMuted,
                              fontSize: 12,
                            }}
                          >
                            No time restrictions
                          </Text>
                        </VStack>
                      )}
                    </View>
                  </VStack>
                )}

                {/* Edit Mode - Time Inputs */}
                {isEditing && (
                  <VStack space="md">
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <Clock size={16} color={theme.warning} />
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        Access Hours (Optional)
                      </Text>
                    </HStack>

                    <HStack space="md" style={{ alignItems: "flex-start" }}>
                      {/* Start Time */}
                      <FormControl
                        style={{ flex: 1 }}
                        isInvalid={!!errors.startTime || !!errors.time}
                      >
                        <FormControlLabel>
                          <Text
                            style={{ color: theme.textMuted, fontSize: 12 }}
                          >
                            Start Time
                          </Text>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            value={startTime}
                            onChangeText={(v) => {
                              setStartTime(v);
                              setErrors((e) => ({
                                ...e,
                                startTime: "",
                                time: "",
                              }));
                            }}
                            placeholder="00:00"
                            style={{ color: theme.text }}
                          />
                        </Input>
                        {errors.startTime && (
                          <FormControlError>
                            <Text style={{ color: "#ef4444", fontSize: 11 }}>
                              {errors.startTime}
                            </Text>
                          </FormControlError>
                        )}
                      </FormControl>

                      {/* End Time */}
                      <FormControl
                        style={{ flex: 1 }}
                        isInvalid={!!errors.endTime || !!errors.time}
                      >
                        <FormControlLabel>
                          <Text
                            style={{ color: theme.textMuted, fontSize: 12 }}
                          >
                            End Time
                          </Text>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            value={endTime}
                            onChangeText={(v) => {
                              setEndTime(v);
                              setErrors((e) => ({
                                ...e,
                                endTime: "",
                                time: "",
                              }));
                            }}
                            placeholder="23:59"
                            style={{ color: theme.text }}
                          />
                        </Input>
                        {errors.endTime && (
                          <FormControlError>
                            <Text style={{ color: "#ef4444", fontSize: 11 }}>
                              {errors.endTime}
                            </Text>
                          </FormControlError>
                        )}
                      </FormControl>
                    </HStack>

                    {errors.time && (
                      <Text style={{ color: "#ef4444", fontSize: 11 }}>
                        {errors.time}
                      </Text>
                    )}

                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 11,
                        fontStyle: "italic",
                      }}
                    >
                      💡 Use 24-hour format (HH:MM). Leave both empty for 24/7
                      access.
                      {"\n"}Example: 08:00 - 18:00 for 8 AM to 6 PM access.
                    </Text>
                  </VStack>
                )}

                {/* Room Permissions Section - EDITING MODE */}
                {isEditing && (
                  <>
                    <Divider style={{ backgroundColor: theme.border }} />

                    <VStack space="md">
                      <HStack space="sm" style={{ alignItems: "center" }}>
                        <Shield size={16} color={theme.accent} />
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          Room Access Permissions
                        </Text>
                      </HStack>

                      <VStack
                        space="xs"
                        style={{
                          backgroundColor: theme.background,
                          padding: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        {rooms.length === 0 ? (
                          <Text
                            style={{
                              color: theme.textMuted,
                              textAlign: "center",
                              paddingVertical: 12,
                            }}
                          >
                            No rooms available
                          </Text>
                        ) : (
                          rooms.map((room) => (
                            <View
                              key={room.id}
                              style={{
                                backgroundColor: selectedRooms.has(room.id)
                                  ? theme.successLight
                                  : theme.cardBg,
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: selectedRooms.has(room.id)
                                  ? theme.success
                                  : theme.border,
                              }}
                            >
                              <Checkbox
                                value={room.id}
                                isChecked={selectedRooms.has(room.id)}
                                onChange={() => toggleRoom(room.id)}
                                size="md"
                              >
                                <CheckboxIndicator>
                                  <CheckboxIcon as={CheckIcon} />
                                </CheckboxIndicator>
                                <CheckboxLabel
                                  style={{
                                    color: selectedRooms.has(room.id)
                                      ? theme.success
                                      : theme.text,
                                    fontWeight: "600",
                                  }}
                                >
                                  {room.name}
                                </CheckboxLabel>
                              </Checkbox>
                            </View>
                          ))
                        )}
                      </VStack>

                      <Text
                        style={{
                          color: theme.textMuted,
                          fontSize: 11,
                          fontStyle: "italic",
                        }}
                      >
                        💡 Select which rooms this person can access
                      </Text>
                    </VStack>
                  </>
                )}

                {/* Room Permissions Section - VIEW MODE */}
                {!isEditing && rooms.length > 0 && (
                  <>
                    <Divider style={{ backgroundColor: theme.border }} />

                    <VStack space="md">
                      <HStack
                        space="sm"
                        style={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <HStack space="sm" style={{ alignItems: "center" }}>
                          <Shield size={16} color={theme.accent} />
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 14,
                              fontWeight: "600",
                            }}
                          >
                            Room Access Permissions
                          </Text>
                        </HStack>
                        <Text
                          style={{
                            color: theme.textMuted,
                            fontSize: 11,
                          }}
                        >
                          {selectedRooms.size} / {rooms.length} rooms
                        </Text>
                      </HStack>

                      <VStack space="xs">
                        {rooms.map((room) => {
                          const roomPermission = displayUser[room.id];
                          const hasAccess = roomPermission === true;

                          return (
                            <HStack
                              key={room.id}
                              space="sm"
                              style={{
                                padding: 12,
                                backgroundColor: hasAccess
                                  ? theme.successLight
                                  : theme.dangerLight,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: hasAccess
                                  ? theme.success
                                  : theme.danger,
                                alignItems: "center",
                              }}
                            >
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: hasAccess
                                    ? theme.success + "30"
                                    : theme.danger + "30",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                {hasAccess ? (
                                  <Unlock size={16} color={theme.success} />
                                ) : (
                                  <Lock size={16} color={theme.danger} />
                                )}
                              </View>

                              <VStack style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    color: hasAccess
                                      ? theme.success
                                      : theme.danger,
                                    fontSize: 13,
                                    fontWeight: "600",
                                  }}
                                >
                                  {room.name}
                                </Text>
                                <Text
                                  style={{
                                    color: theme.textMuted,
                                    fontSize: 11,
                                  }}
                                >
                                  {hasAccess
                                    ? "Access granted"
                                    : "Access denied"}
                                </Text>
                              </VStack>

                              <View
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  backgroundColor: hasAccess
                                    ? theme.success + "20"
                                    : theme.danger + "20",
                                  borderRadius: 12,
                                }}
                              >
                                <Text
                                  style={{
                                    color: hasAccess
                                      ? theme.success
                                      : theme.danger,
                                    fontSize: 11,
                                    fontWeight: "700",
                                  }}
                                >
                                  {hasAccess ? "✓ ALLOWED" : "✗ BLOCKED"}
                                </Text>
                              </View>
                            </HStack>
                          );
                        })}
                      </VStack>
                    </VStack>
                  </>
                )}

                <Divider style={{ backgroundColor: theme.border }} />

                {/* Action Buttons */}
                {!isEditing ? (
                  <VStack space="sm">
                    <Button
                      size="lg"
                      onPress={() => setIsEditing(true)}
                      style={{
                        backgroundColor: theme.accent,
                      }}
                    >
                      <ButtonIcon as={Edit} />
                      <ButtonText>Edit User</ButtonText>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      action="negative"
                      onPress={() => setShowDeleteConfirm(true)}
                      style={{
                        borderColor: "#ef4444",
                      }}
                    >
                      <ButtonIcon as={Trash2} />
                      <ButtonText style={{ color: "#ef4444" }}>
                        Delete User
                      </ButtonText>
                    </Button>
                  </VStack>
                ) : (
                  <VStack space="sm">
                    <Button
                      size="lg"
                      onPress={handleSave}
                      disabled={loading}
                      style={{
                        backgroundColor: theme.accent,
                      }}
                    >
                      {loading && <Spinner size="small" color="#fff" />}
                      <ButtonText>
                        {loading ? "Saving..." : "Save Changes"}
                      </ButtonText>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      action="secondary"
                      onPress={handleCancel}
                      disabled={loading}
                    >
                      <ButtonText>Cancel</ButtonText>
                    </Button>
                  </VStack>
                )}
              </VStack>

              {/* Right Section - Activity Logs */}
              <VStack
                space="md"
                style={{
                  flex: 2,
                  padding: 16,
                  backgroundColor: theme.cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <HStack
                  space="sm"
                  style={{
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Activity size={24} color={theme.accent} />
                  <Heading size="lg" style={{ color: theme.text }}>
                    Activity Logs
                  </Heading>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 14,
                      marginLeft: "auto",
                    }}
                  >
                    {userLogs.length}{" "}
                    {userLogs.length === 1 ? "entry" : "entries"}
                  </Text>
                </HStack>

                <Divider style={{ backgroundColor: theme.border }} />

                {userLogs.length === 0 ? (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 40,
                    }}
                  >
                    <Activity size={48} color={theme.textMuted} />
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 16,
                        marginTop: 12,
                      }}
                    >
                      No activity logs found
                    </Text>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      This user hasn't performed any actions yet
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={true}
                  >
                    <VStack space="sm">
                      {userLogs.map((log) => {
                        const actionColors = getActionBadgeColor(log.action);
                        return (
                          <View
                            key={log.id}
                            style={{
                              padding: 12,
                              backgroundColor: theme.background,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: theme.border,
                            }}
                          >
                            <HStack
                              space="sm"
                              style={{
                                alignItems: "flex-start",
                                marginBottom: 8,
                              }}
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
                                  backgroundColor: theme.accentLight,
                                  borderRadius: 8,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <MapPin size={12} color={theme.accent} />
                                <Text
                                  style={{
                                    color: theme.accent,
                                    fontSize: 11,
                                    fontWeight: "600",
                                  }}
                                >
                                  {log.roomId}
                                </Text>
                              </View>
                            </HStack>

                            {/* Timestamp */}
                            <HStack space="xs" style={{ alignItems: "center" }}>
                              <Clock size={14} color={theme.textMuted} />
                              <Text
                                style={{
                                  color: theme.textMuted,
                                  fontSize: 12,
                                }}
                              >
                                {log.timestamp.toDate().toLocaleString()}
                              </Text>
                            </HStack>
                          </View>
                        );
                      })}
                    </VStack>
                  </ScrollView>
                )}
              </VStack>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <ModalBackdrop />
        <ModalContent style={{ backgroundColor: theme.background }}>
          <ModalHeader>
            <Heading size="lg" style={{ color: theme.text }}>
              Confirm Delete
            </Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} style={{ color: theme.text }} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <UIAlert action="error" variant="solid">
              <AlertText>
                Are you sure you want to delete {user?.name}? This action cannot
                be undone and will permanently remove all associated data.
              </AlertText>
            </UIAlert>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={() => setShowDeleteConfirm(false)}
              disabled={loading}
              style={{ marginRight: 12 }}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="negative" onPress={handleDelete} disabled={loading}>
              {loading && <Spinner size="small" color="#fff" />}
              <ButtonText>{loading ? "Deleting..." : "Delete"}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
