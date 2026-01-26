import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
      <Button onPress={() => router.replace("/screens/dashboard")}>
        <ButtonText>Login</ButtonText>
      </Button>
    </View>
  );
}
