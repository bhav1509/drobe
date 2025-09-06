import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { db } from "../db";
import { useRoute, useNavigation } from "@react-navigation/native";

type ItemRow = {
  id: string;
  title: string | null;
  type: string | null;
  silhouettePath: string;
  originalPath: string | null;
  createdAt: string;
};

export default function ItemDetail() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { id } = route.params as { id: string };

  const [item, setItem] = useState<ItemRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const row = await db.getFirstAsync<ItemRow>(
          "SELECT * FROM items WHERE id=?",
          [id]
        );
        setItem(row || null);
        setTitle(row?.title ?? "");
        setType(row?.type ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save() {
    if (!item) return;
    await db.runAsync("UPDATE items SET title=?, type=? WHERE id=?", [
      title || null,
      type || null,
      item.id,
    ]);
    Alert.alert("Saved", "Item updated.");
    nav.goBack(); // Closet will auto-refresh
  }

  async function remove() {
    if (!item) return;
    Alert.alert("Delete item", "This will remove the item from your closet.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await db.runAsync("DELETE FROM items WHERE id=?", [item.id]);
          Alert.alert("Deleted", "Item removed.");
          nav.goBack();
        },
      },
    ]);
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

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B0B0B",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "#fff", marginBottom: 12 }}>Item not found.</Text>
        <Pressable
          onPress={() => nav.goBack()}
          style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8 }}
        >
          <Text>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const imgUri =
    showOriginal && item.originalPath ? item.originalPath : item.silhouettePath;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <Pressable
            onPress={() => setShowOriginal(false)}
            style={{
              backgroundColor: !showOriginal ? "#fff" : "#222",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: !showOriginal ? "#000" : "#fff" }}>
              Silhouette
            </Text>
          </Pressable>
          <Pressable
            onPress={() => item.originalPath && setShowOriginal(true)}
            disabled={!item.originalPath}
            style={{
              backgroundColor: showOriginal ? "#fff" : "#222",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              opacity: item.originalPath ? 1 : 0.5,
            }}
          >
            <Text style={{ color: showOriginal ? "#000" : "#fff" }}>
              Original
            </Text>
          </Pressable>
        </View>

        <Image
          source={{ uri: imgUri }}
          style={{
            width: "100%",
            aspectRatio: 1,
            borderRadius: 12,
            backgroundColor: "#111",
          }}
        />

        <Text style={{ color: "#bbb", marginTop: 12 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Black Tee"
          placeholderTextColor="#888"
          style={{
            color: "#fff",
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
          }}
        />

        <Text style={{ color: "#bbb", marginTop: 12 }}>Type</Text>
        <TextInput
          value={type}
          onChangeText={setType}
          placeholder="top / bottom / shoe / accessory"
          placeholderTextColor="#888"
          autoCapitalize="none"
          style={{
            color: "#fff",
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
          }}
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={save}
            style={{
              backgroundColor: "#0066cc",
              padding: 14,
              borderRadius: 10,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
          </Pressable>
          <Pressable
            onPress={remove}
            style={{
              backgroundColor: "#b00020",
              padding: 14,
              borderRadius: 10,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
