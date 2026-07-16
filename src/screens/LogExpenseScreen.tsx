import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { supabase } from "../lib/supabase";
import { calcDailyLimit, todayISO, updateBuffer } from "../utils/budgetEngine";
import type { Category } from "../types";

export default function LogExpenseScreen({ route, navigation }: any) {
  const { goalId } = route.params;
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);
      setCategories(data ?? []);
    })();
  }, []);

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Enter an amount", "How much did you spend?");
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    // 1. Insert the transaction.
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      goal_id: goalId,
      category_id: categoryId,
      amount: Number(amount),
      note,
      is_recurring: isRecurring,
      occurred_on: todayISO(),
      source: "manual",
    });

    if (txError) {
      setSaving(false);
      Alert.alert("Couldn't save expense", txError.message);
      return;
    }

    // 2. Recompute today's limit and fold the result into the hidden buffer.
    // (This mirrors the same calculation HomeScreen does — in a larger app,
    // pull this into a shared hook so the two never drift apart.)
    const { data: goal } = await supabase.from("goals").select("*").eq("id", goalId).single();
    const { data: buffer } = await supabase
      .from("buffer_state")
      .select("*")
      .eq("goal_id", goalId)
      .single();
    const { data: incomeRows } = await supabase
      .from("income_sources")
      .select("amount")
      .eq("user_id", user.id)
      .eq("frequency", "monthly");
    const monthlyIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const avgDailyIncome = monthlyIncome / 30;

    if (goal && buffer) {
      const { data: todaysTx } = await supabase
        .from("transactions")
        .select("amount")
        .eq("goal_id", goalId)
        .eq("occurred_on", todayISO());
      const todaySpend = (todaysTx ?? []).reduce((s, t) => s + Number(t.amount), 0);

      const { dailySpendingLimit } = calcDailyLimit({
        targetAmount: Number(goal.target_amount),
        currentSavings: Number(goal.start_amount), // simplified — see HomeScreen for the fuller calc
        targetDateISO: goal.target_date,
        avgDailyIncome,
        todayISO: todayISO(),
      });

      const { newBuffer } = updateBuffer({
        todaySpend,
        dailyLimit: dailySpendingLimit,
        currentBuffer: Number(buffer.buffer_amount),
      });

      await supabase
        .from("buffer_state")
        .update({ buffer_amount: newBuffer, updated_at: new Date().toISOString() })
        .eq("goal_id", goalId);
    }

    setSaving(false);
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log an expense</Text>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        placeholder="250"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipSelected]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={categoryId === c.id ? styles.chipTextSelected : styles.chipText}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput style={styles.input} placeholder="Lunch with friends" value={note} onChangeText={setNote} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Recurring expense</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>

      <Pressable style={styles.button} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save expense"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#0F6E56", marginBottom: 20 },
  label: { fontSize: 14, color: "#5F5E5A", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#D3D1C7",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#D3D1C7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: "#0F6E56", borderColor: "#0F6E56" },
  chipText: { color: "#5F5E5A" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  button: {
    backgroundColor: "#0F6E56",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
