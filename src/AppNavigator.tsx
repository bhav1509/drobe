import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Closet from "./screens/Closet";
import AddItem from "./screens/AddItem";
import ItemDetail from "./screens/ItemDetail";
import MySilhouette from "./screens/MySilhouette";
import MixMatch from './screens/MixMatch';


export type DrobeStackParamList = {
  Closet: undefined;
  AddItem: undefined;
  ItemDetail: { id: string };
  MySilhouette: undefined;
  MixMatch: undefined;
};

const Stack = createNativeStackNavigator<DrobeStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator id={undefined}>
      <Stack.Screen name="Closet" component={Closet} />
      <Stack.Screen
        name="AddItem"
        component={AddItem}
        options={{ title: "Add Item" }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetail}
        options={{ title: "Item" }}
      />
      <Stack.Screen
        name="MySilhouette"
        component={MySilhouette}
        options={{ title: "My Silhouette" }}
      />
      <Stack.Screen
        name="MixMatch"
        component={MixMatch}
        options={{ title: "Mix & Match" }}
      />
    </Stack.Navigator>
  );
}
