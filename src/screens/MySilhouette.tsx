import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db } from "../db";

type ProfileRow = { id: 1; bodyPath: string | null; updatedAt: string };

export default function MySilhouette() {
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await db.getFirstAsync<ProfileRow>(
          "SELECT * FROM profile WHERE id=1"
        );
        setRow(
          r ?? { id: 1, bodyPath: null, updatedAt: new Date().toISOString() }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function ensureCameraPermission() {
    const cur = await ImagePicker.getCameraPermissionsAsync();
    if (cur.status === "granted") return true;
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

      const MEDIA_IMAGES =
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images;

      const res = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
        ...(MEDIA_IMAGES ? { mediaTypes: MEDIA_IMAGES } : {}),
      });
      if (!res.canceled) {
        const uri = res.assets[0].uri;
        setRow((r) =>
          r
            ? { ...r, bodyPath: uri }
            : { id: 1, bodyPath: uri, updatedAt: new Date().toISOString() }
        );
      }
    } catch (e: any) {
      Alert.alert("Camera error", e?.message ?? String(e));
    }
  }

  async function pickFromGallery() {
    try {
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

      const MEDIA_IMAGES =
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images;

      const res: any = await ImagePicker.launchImageLibraryAsync(
        MEDIA_IMAGES ? { mediaTypes: MEDIA_IMAGES } : {}
      );

      if ((res as any).canceled === true || (res as any).cancelled === true)
        return;

      const pickedUri =
        Array.isArray(res?.assets) && res.assets.length > 0
          ? res.assets[0].uri
          : typeof res?.uri === "string"
          ? res.uri
          : undefined;

      if (!pickedUri) {
        Alert.alert("Gallery", "No image selected.");
        return;
      }

      // ✅ update profile row (no setUri on this screen)
      setRow((r) =>
        r
          ? { ...r, bodyPath: pickedUri }
          : { id: 1, bodyPath: pickedUri, updatedAt: new Date().toISOString() }
      );
    } catch (e: any) {
      Alert.alert("Gallery error", e?.message ?? String(e));
    }
  }

  async function save() {
    if (!row) return;
    setBusy(true);
    try {
      await db.runAsync(
        `INSERT INTO profile (id, bodyPath, updatedAt)
         VALUES (1, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET bodyPath=excluded.bodyPath, updatedAt=excluded.updatedAt`,
        [row.bodyPath ?? null]
      );
      Alert.alert("Saved", "Your silhouette has been updated.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSilhouette() {
    Alert.alert(
      "Remove silhouette?",
      "This will clear your saved body photo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await db.runAsync(
                `INSERT INTO profile (id, bodyPath, updatedAt)
               VALUES (1, NULL, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET bodyPath=NULL, updatedAt=datetime('now')`
              );
              setRow((r) =>
                r
                  ? { ...r, bodyPath: null }
                  : {
                      id: 1,
                      bodyPath: null,
                      updatedAt: new Date().toISOString(),
                    }
              );
              Alert.alert("Removed", "Silhouette cleared.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B0B0B",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          My Silhouette
        </Text>

        <Text style={{ color: "#bbb" }}>
          Pick or take a full-body photo (plain background helps). We’ll use
          this for mix & match later.
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <Pressable
            onPress={takePhoto}
            style={{
              backgroundColor: "#fff",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>📷 Take Photo</Text>
          </Pressable>
          <Pressable
            onPress={pickFromGallery}
            style={{
              backgroundColor: "#fff",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>🖼️ Pick from Gallery</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={busy}
            style={{
              backgroundColor: busy ? "#666" : "#0066cc",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
            )}
          </Pressable>
          <Pressable
            onPress={removeSilhouette}
            style={{
              backgroundColor: "#b00020",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Remove</Text>
          </Pressable>
        </View>

        {row?.bodyPath ? (
          <Image
            source={{ uri: row.bodyPath }}
            style={{
              width: "100%",
              aspectRatio: 3 / 4,
              borderRadius: 12,
              marginTop: 16,
              backgroundColor: "#111",
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 12,
              backgroundColor: "#111",
            }}
          >
            <Text style={{ color: "#888" }}>
              No silhouette yet. Use “📷 Take Photo” or “🖼️ Pick from Gallery”.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
