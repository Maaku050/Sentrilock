// components/AdminGuard.tsx
import { useEffect, useState } from "react";
import { useRouter, useSegments, useRootNavigationState } from "expo-router";
import { isAdminLoggedIn } from "@/utils/adminAuth";
import { View, ActivityIndicator } from "react-native";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Don't check auth until navigation is ready
    if (!navigationState?.key) return;

    const checkAuth = async () => {
      const loggedIn = await isAdminLoggedIn();

      // Check if we're trying to access the screens group (protected area)
      const inScreensGroup = segments[0] === "screens";

      if (!loggedIn && inScreensGroup) {
        // Not logged in but trying to access protected screens
        router.replace("/");
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [segments, navigationState?.key]);

  if (isLoading || !navigationState?.key) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return <>{children}</>;
}
