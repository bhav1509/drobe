import React, { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, Image } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { db } from "../db";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type ItemRow = {
  id: string;
  title: string | null;
  type: string | null;
  silhouettePath: string;
  originalPath: string | null;
  createdAt: string;
};

export default function Closet() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [count, setCount] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const all = await db.getAllAsync<ItemRow>(
        "SELECT * FROM items ORDER BY datetime(createdAt) DESC"
      );
      setItems(all);
      setCount(all.length);
    } catch {
      setItems([]);
      setCount(0);
    }
  }, []);

  // Refresh list every time this screen comes into focus (after saving an item)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = ({ item }: { item: ItemRow }) => (
    <Pressable
      onPress={() => nav.navigate("ItemDetail", { id: item.id })}
      style={{
        flex: 1,
        margin: 6,
        backgroundColor: "#111",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: item.silhouettePath }}
        style={{ width: "100%", aspectRatio: 1 }}
        resizeMode="cover"
      />
      <View style={{ padding: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1}>
          {item.title || "Untitled"}
        </Text>
        {!!item.type && (
          <Text style={{ color: "#aaa", fontSize: 12 }}>{item.type}</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0B", padding: 16 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <Text
          style={{ color: "#fff", fontSize: 22, fontWeight: "700", flex: 1 }}
        >
          drobe
        </Text>
        <Pressable
          onPress={() => nav.navigate("MixMatch")}
          style={{
            backgroundColor: "#222",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Mix & Match</Text>
        </Pressable>
        <Pressable
          onPress={() => nav.navigate("AddItem")}
          style={{
            backgroundColor: "#fff",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontWeight: "600" }}>+ Add Item</Text>
        </Pressable>
      </View>

      <Text style={{ color: "#bbb", marginBottom: 8 }}>
        Closet items: {count}
      </Text>

      <Pressable
        onPress={() => nav.navigate("MySilhouette")}
        style={{
          backgroundColor: "#fff",
          padding: 14,
          borderRadius: 12,
          alignSelf: "flex-start",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontWeight: "600" }}>Set My Silhouette</Text>
      </Pressable>

      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: "#888", textAlign: "center" }}>
            No items yet. Tap “+ Add Item” to add your first garment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 4 }}
          showsVerticalScrollIndicator
        />
      )}
    </View>
  );
}
