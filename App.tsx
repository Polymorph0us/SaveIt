import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { supabase, isSupabaseConfigured } from "./src/lib/supabase";
import AppNavigator from "./src/navigation/AppNavigator";
import type { Session } from "@supabase/supabase-js";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Shown instead of a crash whenever .env is missing or still has the
  // placeholder values from .env.example.
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.warnTitle}>Almost there</Text>
        <Text style={styles.warnText}>
          Add your real Supabase Project URL and anon key to the .env file in
          this project folder, then stop the server (Ctrl+C) and run{"\n"}
          npx expo start -c
        </Text>
      </View>
    );
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F6E56" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {/* If signed in, land on Home — HomeScreen itself redirects to
          GoalSetup if the user has no active goal yet. */}
      <AppNavigator initialRoute={session ? "Home" : "Auth"} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  warnTitle: { fontSize: 20, fontWeight: "700", color: "#0F6E56", marginBottom: 12 },
  warnText: { fontSize: 15, color: "#5F5E5A", textAlign: "center", lineHeight: 22 },
});
