import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import {
  calcDailyLimit,
  calcProbability,
  todayISO,
  daysBetween,
} from "../utils/budgetEngine";
import type { Goal, BufferState, Transaction } from "../types";

interface Summary {
  goal: Goal;
  buffer: BufferState;
  monthlyIncome: number;
  dailyLimit: number;
  todaySpend: number;
  currentSavings: number;
  probabilityLevel: string;
  probabilityScore: number;
  recentTransactions: Transaction[];
}

export default function HomeScreen({ navigation }: any) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goal } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!goal) {
      navigation.replace("GoalSetup");
      return;
    }

    const { data: buffer } = await supabase
      .from("buffer_state")
      .select("*")
      .eq("goal_id", goal.id)
      .single();

    const { data: incomeRows } = await supabase
      .from("income_sources")
      .select("amount")
      .eq("user_id", user.id)
      .eq("frequency", "monthly");
    const monthlyIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const avgDailyIncome = monthlyIncome / 30;

    const { data: allTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("goal_id", goal.id)
      .order("occurred_on", { ascending: false });

    const transactions = allTx ?? [];
    const today = todayISO();
    const todaySpend = transactions
      .filter((t) => t.occurred_on === today)
      .reduce((s, t) => s + Number(t.amount), 0);

    // Savings so far = starting amount + income earned since goal creation
    // minus everything spent since goal creation. See budgetEngine.ts notes.
    const daysElapsed = Math.max(daysBetween(goal.created_at.slice(0, 10), today), 0);
    const totalSpent = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const currentSavings =
      Number(goal.start_amount) + avgDailyIncome * daysElapsed - totalSpent;

    const { dailySpendingLimit, requiredDailySavings } = calcDailyLimit({
      targetAmount: Number(goal.target_amount),
      currentSavings,
      targetDateISO: goal.target_date,
      avgDailyIncome,
      todayISO: today,
    });

    const last7 = transactions.filter(
      (t) => daysBetween(t.occurred_on, today) < 7
    );
    const trailingAvgDailySpend =
      last7.reduce((s, t) => s + Number(t.amount), 0) / 7;

    const { level, score } = calcProbability({
      requiredDailySavings,
      trailingAvgDailySpend,
      avgDailyIncome,
      bufferAmount: Number(buffer?.buffer_amount ?? 0),
      seedBufferAmount: Number(buffer?.seed_amount ?? 1),
    });

    setSummary({
      goal,
      buffer: buffer as BufferState,
      monthlyIncome,
      dailyLimit: dailySpendingLimit,
      todaySpend,
      currentSavings,
      probabilityLevel: level,
      probabilityScore: score,
      recentTransactions: transactions.slice(0, 8),
    });
    setLoading(false);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading || !summary) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const progress = Math.min(summary.currentSavings / summary.goal.target_amount, 1);
  const remainingToday = Math.max(summary.dailyLimit - summary.todaySpend, 0);
  const badgeStyle =
    summary.probabilityLevel === "on_track"
      ? styles.badgeGood
      : summary.probabilityLevel === "at_risk"
      ? styles.badgeWarn
      : styles.badgeBad;

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ padding: 20 }}>
          <Text style={styles.goalTitle}>{summary.goal.title}</Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Left to spend today</Text>
            <Text style={styles.bigNumber}>₹{remainingToday.toFixed(0)}</Text>
            <Text style={styles.cardSub}>
              of ₹{summary.dailyLimit.toFixed(0)} daily limit
            </Text>
          </View>

          <View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>
              {summary.probabilityLevel.replace("_", " ")} · {summary.probabilityScore}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.cardSub}>
            ₹{summary.currentSavings.toFixed(0)} of ₹{summary.goal.target_amount} saved
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate("LogExpense", { goalId: summary.goal.id })}
          >
            <Text style={styles.buttonText}>+ Log expense</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Recent</Text>
        </View>
      }
      data={summary.recentTransactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.txRow}>
          <Text style={styles.txNote}>{item.note || "Expense"}</Text>
          <Text style={styles.txAmount}>₹{item.amount}</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  goalTitle: { fontSize: 22, fontWeight: "700", color: "#2C2C2A", marginBottom: 16 },
  card: {
    backgroundColor: "#E1F5EE",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: { fontSize: 14, color: "#0F6E56" },
  bigNumber: { fontSize: 36, fontWeight: "700", color: "#04342C", marginVertical: 4 },
  cardSub: { fontSize: 13, color: "#5F5E5A", marginTop: 4 },
  badge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  badgeGood: { backgroundColor: "#EAF3DE" },
  badgeWarn: { backgroundColor: "#FAEEDA" },
  badgeBad: { backgroundColor: "#FCEBEB" },
  badgeText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: "#F1EFE8", overflow: "hidden" },
  progressFill: { height: 10, backgroundColor: "#0F6E56" },
  button: {
    backgroundColor: "#0F6E56",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 28, marginBottom: 8 },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1EFE8",
  },
  txNote: { fontSize: 15, color: "#2C2C2A" },
  txAmount: { fontSize: 15, fontWeight: "600", color: "#2C2C2A" },
});
