import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db } from "../db";
import { removeBgNative } from "../native/BackgroundRemover";

const MEDIA_IMAGES: any =
  (ImagePicker as any).MediaType?.Images ??
  (ImagePicker as any).MediaTypeOptions?.Images;

export default function AddItem() {
  const [uri, setUri] = useState<string | undefined>();
  const [silUri, setSilUri] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("top");
  const [busy, setBusy] = useState(false);

  async function ensureCameraPermission() {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.status === "granted") return true;
    const req = await ImagePicker.requestCameraPermissionsAsync();
    if (req.status === "granted") return true;
    Alert.alert(
      "Camera permission needed",
      "Please allow camera access to take a photo.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  async function ensureMediaPermission() {
    // Current permission
    const cur = await ImagePicker.getMediaLibraryPermissionsAsync();

    // Accept if user granted full access OR iOS "limited" access
    const hasAccess = cur.granted || cur.accessPrivileges === "limited";
    if (hasAccess) return true;

    // Ask once
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const ok = req.granted || req.accessPrivileges === "limited";
    if (ok) return true;

    Alert.alert(
      "Photos permission needed",
      "Please allow photo library access to pick an existing image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  async function takePhoto() {
    try {
      const ok = await ensureCameraPermission();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
        mediaTypes: MEDIA_IMAGES,
      });

      if (!result.canceled) setUri(result.assets[0].uri);
    } catch (e: any) {
      Alert.alert("Camera error", e?.message ?? String(e));
    }
  }

  async function pickFromGallery() {
    try {
      // Permission (treat iOS "limited" as OK)
      const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasAccess = cur.granted || cur.accessPrivileges === "limited";
      if (!hasAccess) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasAccess = req.granted || req.accessPrivileges === "limited";
      }
      if (!hasAccess) {
        Alert.alert(
          "Photos permission needed",
          "Please allow photo library access to pick an existing image.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // New API (no MediaTypeOptions)
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: MEDIA_IMAGES,
      });

      if (res.canceled) return;

      const pickedUri =
        Array.isArray(res.assets) && res.assets.length > 0
          ? res.assets[0].uri
          : undefined;

      if (!pickedUri) {
        Alert.alert("Gallery", "No image selected.");
        return;
      }

      setUri(pickedUri);
    } catch (e: any) {
      Alert.alert("Gallery error", e?.message ?? String(e));
    }
  }

  async function makeSilhouette() {
    if (!uri) return;
    try {
      setBusy(true);
      console.log("Original image URI:", uri);
      const cut = await removeBgNative(uri);
      console.log("Cutout image URI:", cut);
      setSilUri(cut);
    } catch (e: any) {
      console.warn("On-device background removal failed:", e);
      Alert.alert("Background removal failed", e?.message ?? String(e));
      setSilUri(uri);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!silUri)
      return Alert.alert(
        "No silhouette",
        "Pick or take a photo and then tap Create Silhouette."
      );
    const id = Date.now().toString();
    await db.runAsync(
      "INSERT INTO items(id,title,type,silhouettePath,originalPath) VALUES(?,?,?,?,?)",
      [id, title || null, type || null, silUri, uri || null]
    );
    Alert.alert("Saved!", "Item added to closet.");
    setUri(undefined);
    setSilUri(undefined);
    setTitle("");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          alwaysBounceVertical
          showsVerticalScrollIndicator
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Pressable
              onPress={takePhoto}
              style={{ backgroundColor: "#111", padding: 12, borderRadius: 8 }}
            >
              <Text style={{ color: "white" }}>📷 Take Photo</Text>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={{ backgroundColor: "#111", padding: 12, borderRadius: 8 }}
            >
              <Text style={{ color: "white" }}>🖼️ Pick from Gallery</Text>
            </Pressable>
            <Pressable
              disabled={!uri || busy}
              onPress={makeSilhouette}
              style={{
                backgroundColor: !uri || busy ? "#666" : "#0a7",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "white" }}>✨ Create Silhouette</Text>
              )}
            </Pressable>
          </View>

          <TextInput
            placeholder="Title (e.g., Black Tee)"
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
            style={{
              color: "#fff",
              borderWidth: 1,
              borderColor: "#333",
              padding: 10,
              borderRadius: 8,
              marginTop: 12,
            }}
          />

          <TextInput
            placeholder="Type (top/bottom/shoe/accessory)"
            placeholderTextColor="#aaa"
            value={type}
            onChangeText={setType}
            autoCapitalize="none"
            style={{
              color: "#fff",
              borderWidth: 1,
              borderColor: "#333",
              padding: 10,
              borderRadius: 8,
              marginTop: 12,
            }}
          />

          {uri && (
            <Image
              source={{ uri }}
              style={{
                width: "100%",
                height: undefined,
                aspectRatio: 1,
                borderRadius: 12,
                marginTop: 12,
              }}
              resizeMode="cover"
            />
          )}

          {silUri && (
            <Image
              source={{ uri: silUri }}
              style={{
                width: "100%",
                height: undefined,
                aspectRatio: 1,
                borderRadius: 12,
                backgroundColor: "#1a1a1a",
                marginTop: 12,
              }}
              resizeMode="cover"
            />
          )}

          <Pressable
            disabled={!silUri}
            onPress={save}
            style={{
              backgroundColor: silUri ? "#0066cc" : "#666",
              padding: 14,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Save Item</Text>
          </Pressable>

          <Text style={{ color: "#bbb", marginTop: 8 }}>
            Tip: You can pick from gallery now. We’ll add true background
            removal later.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
