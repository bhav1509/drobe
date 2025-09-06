import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/AppNavigator";
import { initDb } from "./src/db";
import { requireNativeModule } from "expo-modules-core";


try {
  const mod = requireNativeModule<any>("BackgroundRemover");
  console.log("BackgroundRemover ping:", mod.ping?.());
} catch (e) {
  console.log("BackgroundRemover not found:", e);
}

export default function App() {
  useEffect(() => {
    initDb();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
