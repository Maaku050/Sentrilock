// app/screens/_layout.tsx
import React, { useState, createContext, useContext } from "react";
import {
  StyleSheet,
  View,
  Image,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { LayoutDashboard, LogOut, UsersRound, Menu } from "lucide-react-native";
import "@/global.css";
import { DashboardProvider } from "@/context/dashboardContext";
import { Heading } from "@/components/ui/heading";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { UsersProvider } from "@/context/usersContext";
import { RoomsProvider } from "@/context/roomsContext";
import { AdminGuard } from "@/components/AdminGuard";
import { clearAdminSession } from "@/utils/adminAuth";
import { DrawerActions } from "@react-navigation/native";

// Theme Context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// Custom Drawer Content
function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
      style={{ backgroundColor: "#000" }}
    >
      {/* Logo Section */}
      <View
        style={{
          padding: 30,
          alignItems: "center",
          backgroundColor: "#000",
          paddingTop: 20,
          paddingBottom: 30,
        }}
      >
        <Image
          source={require("@/assets/images/sksu-logo.png")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
      </View>

      {/* Drawer Items */}
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

// Logout Button Component
function LogoutButton() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      await clearAdminSession(); // Clear admin session
      setShowLogoutModal(false);
      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <>
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Confirm Logout</Heading>
          </ModalHeader>

          <ModalBody>
            <Text style={{ color: "#374151", fontSize: 14 }}>
              Are you sure you want to log out of your account?
            </Text>
          </ModalBody>

          <ModalFooter style={{ gap: 12 }}>
            <Button
              variant="outline"
              action="secondary"
              onPress={() => setShowLogoutModal(false)}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>

            <Button action="negative" onPress={confirmLogout}>
              <ButtonText>Logout</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={16} color="#ef4444" />
      </TouchableOpacity>
    </>
  );
}

// Custom Header Left Component with Drawer Toggle
function HeaderLeft({ icon: Icon, navigation, isMobile }: any) {
  if (isMobile) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={{ paddingLeft: 10 }}
        >
          <Menu color="white" size={24} />
        </TouchableOpacity>
        <Icon color="white" size={24} />
      </View>
    );
  }

  return (
    <View style={{ marginLeft: 10 }}>
      <Icon color="white" size={24} />
    </View>
  );
}

function ScreensLayout() {
  const [isDark, setIsDark] = useState(true);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1280;
  const isMediumScreen = dimensions.width <= 1280 && dimensions.width > 768;
  const isMobile = dimensions.width <= 768;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Dark mode theme
  const theme = {
    background: "#000",
    text: "#fff",
    drawerActive: "#fff",
    drawerInactive: "#fff",
    drawerActiveBg: "#333",
    headerBg: "#000",
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <DashboardProvider>
        <RoomsProvider>
          <UsersProvider>
            <GluestackUIProvider mode="dark">
              <Drawer
                drawerContent={(props: any) => (
                  <CustomDrawerContent {...props} />
                )}
                screenOptions={{
                  drawerType: isLargeScreen
                    ? "permanent"
                    : isMediumScreen
                      ? "front"
                      : "front",
                  drawerStyle: isLargeScreen
                    ? {
                        width: 200,
                        backgroundColor: theme.background,
                        borderRightWidth: 0,
                      }
                    : {
                        width: "70%",
                        backgroundColor: theme.background,
                      },
                  headerShown: true,
                  drawerActiveTintColor: theme.drawerActive,
                  drawerInactiveTintColor: theme.drawerInactive,
                  drawerActiveBackgroundColor: theme.drawerActiveBg,
                  drawerInactiveBackgroundColor: "transparent",
                  drawerItemStyle: {
                    borderRadius: 8,
                    marginHorizontal: 0,
                    marginVertical: 4,
                    paddingLeft: 0,
                  },
                  drawerLabelStyle: {
                    fontSize: 15,
                    fontWeight: "600",
                    marginLeft: -16,
                  },
                  overlayColor: "transparent",
                  sceneStyle: { backgroundColor: "transparent" },
                  headerStyle: {
                    backgroundColor: theme.headerBg,
                    borderColor: theme.headerBg,
                  },
                  headerTitleStyle: {
                    fontWeight: "bold",
                    fontSize: 24,
                    color: theme.text,
                  },
                  headerTintColor: theme.text,
                  headerRight: () => <LogoutButton />,
                }}
              >
                <Drawer.Screen
                  name="dashboard"
                  options={({ navigation }) => ({
                    title: "Dashboard",
                    drawerIcon: ({ color }) => (
                      <LayoutDashboard
                        color={color}
                        size={25}
                        className="mr-2"
                      />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Dashboard
                      </Heading>
                    ),
                    headerLeft: () => (
                      <HeaderLeft
                        icon={LayoutDashboard}
                        navigation={navigation}
                        isMobile={isMobile}
                      />
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                  })}
                />
                <Drawer.Screen
                  name="registeredUsers"
                  options={({ navigation }) => ({
                    title: "Users",
                    drawerIcon: ({ color }) => (
                      <UsersRound color={color} size={25} className="mr-2" />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Users
                      </Heading>
                    ),
                    headerLeft: () => (
                      <HeaderLeft
                        icon={UsersRound}
                        navigation={navigation}
                        isMobile={isMobile}
                      />
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                  })}
                />
                <Drawer.Screen
                  name="bulkDeleteLogs"
                  options={({ navigation }) => ({
                    title: "Delete",
                    drawerItemStyle: { display: "none" },
                    drawerIcon: ({ color }) => (
                      <UsersRound color={color} size={25} className="mr-2" />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Users
                      </Heading>
                    ),
                    headerLeft: () => (
                      <HeaderLeft
                        icon={UsersRound}
                        navigation={navigation}
                        isMobile={isMobile}
                      />
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                  })}
                />
              </Drawer>
            </GluestackUIProvider>
          </UsersProvider>
        </RoomsProvider>
      </DashboardProvider>
    </ThemeContext.Provider>
  );
}

// Wrap the entire layout with AdminGuard
export default function RootLayout() {
  return (
    <AdminGuard>
      <ScreensLayout />
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  headerSpace: {
    alignContent: "center",
    alignItems: "center",
    borderBottomWidth: 0,
    height: 50,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginRight: 10,
  },
});
