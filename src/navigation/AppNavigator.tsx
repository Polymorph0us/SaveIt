import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "../screens/AuthScreen";
import GoalSetupScreen from "../screens/GoalSetupScreen";
import HomeScreen from "../screens/HomeScreen";
import LogExpenseScreen from "../screens/LogExpenseScreen";

export type RootStackParamList = {
  Auth: undefined;
  GoalSetup: undefined;
  Home: undefined;
  LogExpense: { goalId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// `initialRoute` is decided in App.tsx based on whether a session exists.
export default function AppNavigator({ initialRoute }: { initialRoute: keyof RootStackParamList }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoalSetup" component={GoalSetupScreen} options={{ title: "New goal" }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "FI Goal" }} />
      <Stack.Screen name="LogExpense" component={LogExpenseScreen} options={{ title: "Log expense", presentation: "modal" }} />
    </Stack.Navigator>
  );
}
