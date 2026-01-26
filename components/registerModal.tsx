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
import { useState } from "react";
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
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { ButtonSpinner } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Alert, AlertText } from "@/components/ui/alert";
import { useTheme } from "../app/screens/_layout";

interface ModalTypes {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegisterModal({ visible, onClose, onSuccess }: ModalTypes) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validation states
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [imageError, setImageError] = useState("");

  const { isDark } = useTheme();

  const theme = {
    background: isDark ? "#1a1a1a" : "#fff",
    text: isDark ? "#fff" : "#000",
    textSecondary: isDark ? "#ccc" : "#333",
    textMuted: isDark ? "#888" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#0a0a0a" : "#f9fafb",
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setImageError("Please select a valid image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setImageError("Image must be less than 10MB");
        return;
      }

      setImageFile(file);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Reset errors
    setNameError("");
    setEmailError("");
    setImageError("");
    setError("");

    // Validate name
    if (!name.trim()) {
      setNameError("Name is required");
      isValid = false;
    }

    // Validate email (optional but must be valid if provided)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    // Validate image
    if (!imageFile) {
      setImageError("Profile image is required");
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
      // Convert image file to ArrayBuffer
      const arrayBuffer = await imageFile!.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("name", name.trim());
      if (email.trim()) params.append("email", email.trim());
      if (contact.trim()) params.append("phone", contact.trim());

      // Send request
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

        // Clear form
        setTimeout(() => {
          setName("");
          setEmail("");
          setContact("");
          setImageFile(null);
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
      setError("");
      setSuccess("");
      setNameError("");
      setEmailError("");
      setImageError("");
      onClose();
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent style={{ backgroundColor: theme.background }}>
        <ModalHeader>
          <Heading size="lg" style={{ color: theme.text }}>
            Register New Person
          </Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} style={{ color: theme.text }} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            {/* Error Alert */}
            {error && (
              <Alert action="error" variant="solid">
                <AlertText>{error}</AlertText>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert action="success" variant="solid">
                <AlertText>{success}</AlertText>
              </Alert>
            )}

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
          </VStack>
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
