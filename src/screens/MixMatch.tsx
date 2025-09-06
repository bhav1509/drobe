import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
  FlatList,
} from "react-native";
import { db } from "../db";
import { useNavigation } from "@react-navigation/native";

type ProfileRow = { id: 1; bodyPath: string | null; updatedAt: string };
type ItemRow = {
  id: string;
  title: string | null;
  type: string | null;
  silhouettePath: string;
  originalPath: string | null;
  createdAt: string;
};

export default function MixMatch() {
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selected, setSelected] = useState<ItemRow | null>(null);

  // draggable + scalable overlay
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  // pan responder for drag
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const { x, y } = (pos as any).__getValue?.() ?? { x: 0, y: 0 };
          pos.setOffset({ x, y });
          pos.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => pos.flattenOffset(),
      }),
    [pos]
  );

  useEffect(() => {
    (async () => {
      try {
        const p = await db.getFirstAsync<ProfileRow>(
          "SELECT * FROM profile WHERE id=1"
        );
        setProfile(
          p ?? { id: 1, bodyPath: null, updatedAt: new Date().toISOString() }
        );

        const all = await db.getAllAsync<ItemRow>(
          `SELECT * FROM items ORDER BY datetime(createdAt) DESC`
        );
        setItems(all);
        setSelected(all[0] ?? null);
      } catch (e: any) {
        Alert.alert("Mix & Match", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function bumpScale(delta: number) {
    scale.stopAnimation((curr: number) => {
      const next = Math.max(0.2, Math.min(5, curr + delta));
      scale.setValue(next);
    });
  }

  function resetTransform() {
    pos.setValue({ x: 0, y: 0 });
    scale.setValue(1);
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

  if (!profile?.bodyPath) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#0B0B0B", padding: 16 }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Mix & Match
        </Text>
        <Text style={{ color: "#bbb", marginBottom: 16 }}>
          You haven’t set your body silhouette yet.
        </Text>
        <Pressable
          onPress={() => nav.navigate("MySilhouette")}
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 10,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "600" }}>Set My Silhouette</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!items.length) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#0B0B0B", padding: 16 }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Mix & Match
        </Text>
        <Text style={{ color: "#bbb", marginBottom: 16 }}>
          No items yet. Add an item to try it on your silhouette.
        </Text>
        <Pressable
          onPress={() => nav.navigate("AddItem")}
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 10,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "600" }}>+ Add Item</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0B0B" }}>
      {/* header / controls */}
      <View
        style={{
          padding: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{ color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 }}
        >
          Mix & Match
        </Text>
        <Pressable
          onPress={resetTransform}
          style={{
            backgroundColor: "#222",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#fff" }}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={() => bumpScale(-0.1)}
          style={{
            backgroundColor: "#222",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginRight: 8,
          }}
        >
          <Text style={{ color: "#fff" }}>−</Text>
        </Pressable>
        <Pressable
          onPress={() => bumpScale(+0.1)}
          style={{
            backgroundColor: "#222",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff" }}>＋</Text>
        </Pressable>
      </View>

      {/* stage */}
      <View style={{ flex: 1, padding: 16, paddingTop: 0 }}>
        <View
          style={{
            width: "100%",
            aspectRatio: 3 / 4,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#111",
          }}
        >
          {/* background silhouette */}
          <Image
            source={{ uri: profile.bodyPath! }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* overlay draggable item */}
          {!!selected && (
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                },
                {
                  transform: [
                    { translateX: pos.x },
                    { translateY: pos.y },
                    { scale },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: selected.silhouettePath }}
                style={{ width: "60%", height: undefined, aspectRatio: 1 }}
                resizeMode="contain"
              />
            </Animated.View>
          )}
        </View>

        <Text style={{ color: "#bbb", marginTop: 8 }}>
          Tip: drag the item; use ＋ / − to scale.
        </Text>
      </View>

      {/* item carousel */}
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: "#0B0B0B",
        }}
      >
        <FlatList
          data={items}
          horizontal
          keyExtractor={(it) => it.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
          renderItem={({ item }) => {
            const active = item.id === selected?.id;
            return (
              <Pressable
                onPress={() => {
                  setSelected(item);
                  resetTransform();
                }}
                style={{
                  marginRight: 10,
                  borderRadius: 10,
                  padding: 2,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? "#0af" : "#333",
                  backgroundColor: "#111",
                }}
              >
                <Image
                  source={{ uri: item.silhouettePath }}
                  style={{ width: 70, height: 70, borderRadius: 8 }}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
          ListHeaderComponent={
            <View style={{ justifyContent: "center", marginRight: 12 }}>
              <Text style={{ color: "#bbb" }}>Items</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
