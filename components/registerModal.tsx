// components/registerModal.tsx - WITH TIME-BASED ACCESS CONTROL
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { useState, useEffect } from "react";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { AlertCircleIcon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { ButtonSpinner } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Alert, AlertText } from "@/components/ui/alert";
import { useTheme } from "../app/screens/_layout";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { db } from "@/firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Clock } from "lucide-react-native";

interface ModalTypes {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Room {
  id: string;
  name: string;
}

export function RegisterModal({ visible, onClose, onSuccess }: ModalTypes) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Validation states
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [imageError, setImageError] = useState("");
  const [roomError, setRoomError] = useState("");
  const [timeError, setTimeError] = useState("");

  const { isDark } = useTheme();

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#333",
    textMuted: isDark ? "#888" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#0a0a0a" : "#f9fafb",
    cardBg: isDark ? "#0f0f0f" : "#f3f4f6",
    warning: isDark ? "#f59e0b" : "#d97706",
  };

  // Fetch rooms on mount
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      if (!file.type.startsWith("image/")) {
        setImageError("Please select a valid image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setImageError("Image must be less than 10MB");
        return;
      }

      setImageFile(file);
    }
  };

  const toggleRoom = (roomId: string) => {
    setRoomError("");
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    setNameError("");
    setEmailError("");
    setImageError("");
    setRoomError("");
    setTimeError("");
    setError("");

    if (!name.trim()) {
      setNameError("Name is required");
      isValid = false;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    if (!imageFile) {
      setImageError("Profile image is required");
      isValid = false;
    }

    if (selectedRooms.size === 0) {
      setRoomError("Please select at least one room");
      isValid = false;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (startTime && !timeRegex.test(startTime)) {
      setTimeError("Invalid start time format (use HH:MM)");
      isValid = false;
    }

    if (endTime && !timeRegex.test(endTime)) {
      setTimeError("Invalid end time format (use HH:MM)");
      isValid = false;
    }

    // Both or neither should be set
    if ((startTime && !endTime) || (!startTime && endTime)) {
      setTimeError(
        "Both start and end times must be set, or leave both empty for 24/7 access",
      );
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const arrayBuffer = await imageFile!.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      const params = new URLSearchParams();
      params.append("name", name.trim());
      if (email.trim()) params.append("email", email.trim());
      if (contact.trim()) params.append("phone", contact.trim());

      // Add time-based access if specified
      if (startTime && endTime) {
        params.append("startTime", startTime);
        params.append("endTime", endTime);
      }

      // Add room permissions
      selectedRooms.forEach((roomId) => {
        params.append(roomId, "true");
      });

      const response = await fetch(
        `https://esp32cam-b5bx42kifq-uc.a.run.app/register?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
          },
          body: imageBuffer,
        },
      );

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSuccess(`Successfully registered ${name}!`);

        setTimeout(() => {
          setName("");
          setEmail("");
          setContact("");
          setImageFile(null);
          setSelectedRooms(new Set());
          setStartTime("");
          setEndTime("");
          setSuccess("");
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setEmail("");
      setContact("");
      setImageFile(null);
      setSelectedRooms(new Set());
      setStartTime("");
      setEndTime("");
      setError("");
      setSuccess("");
      setNameError("");
      setEmailError("");
      setImageError("");
      setRoomError("");
      setTimeError("");
      onClose();
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="full">
      <ModalBackdrop />
      <ModalContent
        style={{ backgroundColor: theme.background, maxWidth: 1000 }}
      >
        <ModalHeader>
          <Heading size="lg" style={{ color: theme.text }}>
            Register New Person
          </Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} style={{ color: theme.text }} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {error && (
            <Alert action="error" variant="solid">
              <AlertText>{error}</AlertText>
            </Alert>
          )}

          {success && (
            <Alert action="success" variant="solid">
              <AlertText>{success}</AlertText>
            </Alert>
          )}
          <HStack space="sm">
            <VStack space="lg" style={{ flex: 1 }}>
              {/* Name Field */}
              <FormControl size="md" isInvalid={!!nameError} isRequired>
                <FormControlLabel>
                  <FormControlLabelText style={{ color: theme.text }}>
                    Full Name
                  </FormControlLabelText>
                </FormControlLabel>
                <Input
                  className="my-1"
                  size="md"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  }}
                >
                  <InputField
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setNameError("");
                    }}
                    style={{ color: theme.text }}
                    placeholderTextColor={theme.textMuted}
                  />
                </Input>
                {nameError && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{nameError}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Email Field */}
              <FormControl size="md" isInvalid={!!emailError}>
                <FormControlLabel>
                  <FormControlLabelText style={{ color: theme.text }}>
                    Email (Optional)
                  </FormControlLabelText>
                </FormControlLabel>
                <Input
                  className="my-1"
                  size="md"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  }}
                >
                  <InputField
                    type="text"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError("");
                    }}
                    style={{ color: theme.text }}
                    placeholderTextColor={theme.textMuted}
                  />
                </Input>
                {emailError && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{emailError}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Contact Field */}
              <FormControl size="md">
                <FormControlLabel>
                  <FormControlLabelText style={{ color: theme.text }}>
                    Contact Number (Optional)
                  </FormControlLabelText>
                </FormControlLabel>
                <Input
                  className="my-1"
                  size="md"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  }}
                >
                  <InputField
                    type="text"
                    placeholder="Enter your contact number"
                    value={contact}
                    onChangeText={(text) => setContact(text)}
                    style={{ color: theme.text }}
                    placeholderTextColor={theme.textMuted}
                  />
                </Input>
              </FormControl>
            </VStack>
            <VStack space="md" style={{ flex: 1 }}>
              {/* Time-Based Access Control */}
              <FormControl size="md" isInvalid={!!timeError}>
                <FormControlLabel>
                  <HStack space="xs" style={{ alignItems: "center" }}>
                    <Clock size={14} color={theme.warning} />
                    <FormControlLabelText style={{ color: theme.text }}>
                      Access Hours (Optional)
                    </FormControlLabelText>
                  </HStack>
                </FormControlLabel>

                <HStack space="md" style={{ alignItems: "flex-start" }}>
                  {/* Start Time */}
                  <Input
                    className="my-1"
                    size="md"
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    }}
                  >
                    <InputField
                      type="text"
                      placeholder="Start (00:00)"
                      value={startTime}
                      onChangeText={(text) => {
                        setStartTime(text);
                        setTimeError("");
                      }}
                      style={{ color: theme.text }}
                      placeholderTextColor={theme.textMuted}
                    />
                  </Input>

                  {/* End Time */}
                  <Input
                    className="my-1"
                    size="md"
                    style={{
                      flex: 1,
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    }}
                  >
                    <InputField
                      type="text"
                      placeholder="End (23:59)"
                      value={endTime}
                      onChangeText={(text) => {
                        setEndTime(text);
                        setTimeError("");
                      }}
                      style={{ color: theme.text }}
                      placeholderTextColor={theme.textMuted}
                    />
                  </Input>
                </HStack>

                {timeError && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{timeError}</FormControlErrorText>
                  </FormControlError>
                )}

                <FormControlHelper>
                  <FormControlHelperText style={{ color: theme.textMuted }}>
                    Use 24-hour format (HH:MM). Leave empty for 24/7 access.
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Image Input Field */}
              <FormControl size="md" isInvalid={!!imageError} isRequired>
                <FormControlLabel>
                  <FormControlLabelText style={{ color: theme.text }}>
                    Profile Image
                  </FormControlLabelText>
                </FormControlLabel>

                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageChange}
                  style={{
                    marginTop: 4,
                    marginBottom: 4,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 6,
                    padding: 8,
                    width: "100%",
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }}
                  disabled={isLoading}
                />

                {imageFile && !imageError && (
                  <FormControlHelper>
                    <FormControlHelperText style={{ color: theme.textMuted }}>
                      ✓ Selected: {imageFile.name} (
                      {(imageFile.size / 1024).toFixed(2)} KB)
                    </FormControlHelperText>
                  </FormControlHelper>
                )}

                {imageError && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{imageError}</FormControlErrorText>
                  </FormControlError>
                )}

                <FormControlHelper>
                  <FormControlHelperText style={{ color: theme.textMuted }}>
                    Upload a clear photo showing your face. Max 10MB.
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Room Permissions */}
              <FormControl size="md" isInvalid={!!roomError} isRequired>
                <FormControlLabel>
                  <FormControlLabelText style={{ color: theme.text }}>
                    Room Access Permissions
                  </FormControlLabelText>
                </FormControlLabel>

                <VStack
                  space="sm"
                  style={{
                    backgroundColor: theme.cardBg,
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
                        paddingVertical: 8,
                      }}
                    >
                      No rooms available
                    </Text>
                  ) : (
                    rooms.map((room) => (
                      <Checkbox
                        key={room.id}
                        value={room.id}
                        isChecked={selectedRooms.has(room.id)}
                        onChange={() => toggleRoom(room.id)}
                        size="md"
                      >
                        <CheckboxIndicator>
                          <CheckboxIcon as={CheckIcon} />
                        </CheckboxIndicator>
                        <CheckboxLabel style={{ color: theme.text }}>
                          {room.name}
                        </CheckboxLabel>
                      </Checkbox>
                    ))
                  )}
                </VStack>

                {roomError && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{roomError}</FormControlErrorText>
                  </FormControlError>
                )}

                <FormControlHelper>
                  <FormControlHelperText style={{ color: theme.textMuted }}>
                    Select which rooms this person can access
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>
            </VStack>
          </HStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            action="secondary"
            className="mr-3"
            onPress={handleClose}
            isDisabled={isLoading}
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button onPress={handleSubmit} isDisabled={isLoading}>
            {isLoading && <ButtonSpinner className="mr-2" />}
            <ButtonText>{isLoading ? "Registering..." : "Register"}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
