import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { checkGoalRealism, seedBuffer, todayISO } from "../utils/budgetEngine";

export default function GoalSetupScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [startAmount, setStartAmount] = useState("0");
  const [targetDate, setTargetDate] = useState(""); // YYYY-MM-DD
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [saving, setSaving] = useState(false);

  async function createGoal(overrideAmount?: number, overrideDate?: string) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const finalAmount = overrideAmount ?? Number(targetAmount);
    const finalDate = overrideDate ?? targetDate;

    // 1. Save income so future recalculations don't need it re-entered.
    await supabase.from("income_sources").insert({
      user_id: user.id,
      label: "Primary income",
      amount: Number(monthlyIncome),
      frequency: "monthly",
    });
    await supabase
      .from("profiles")
      .update({ avg_monthly_income: Number(monthlyIncome) })
      .eq("id", user.id);

    // 2. Create the goal.
    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: title || "My goal",
        target_amount: finalAmount,
        start_amount: Number(startAmount),
        target_date: finalDate,
        status: "active",
      })
      .select()
      .single();

    if (error || !goal) {
      setSaving(false);
      Alert.alert("Couldn't create goal", error?.message ?? "Unknown error");
      return;
    }

    // 3. Seed the hidden buffer for this goal.
    const seed = seedBuffer(Number(monthlyIncome));
    await supabase.from("buffer_state").insert({
      goal_id: goal.id,
      buffer_amount: seed,
      seed_amount: seed,
    });

    setSaving(false);
    navigation.replace("Home");
  }

  function handleSubmit() {
    if (!targetAmount || !targetDate || !monthlyIncome) {
      Alert.alert("Missing info", "Fill in amount, date, and monthly income.");
      return;
    }

    const check = checkGoalRealism({
      targetAmount: Number(targetAmount),
      startAmount: Number(startAmount),
      targetDateISO: targetDate,
      createdDateISO: todayISO(),
      monthlyIncome: Number(monthlyIncome),
      historicalAvgMonthlyExpense: null, // no history yet on a brand-new goal
    });

    if (check.isRealistic) {
      createGoal();
      return;
    }

    Alert.alert(
      "This goal looks tough",
      `To hit ₹${targetAmount} by ${targetDate} you'd need to save ~₹${check.requiredMonthlySaving}/month, ` +
        `but a realistic ceiling based on your income is ~₹${check.maxRealisticMonthlySaving}/month.\n\n` +
        `Option A: same amount, extend the date to ${check.suggestedTargetDateISO}\n` +
        `Option B: same date, lower the target to ₹${check.suggestedAmount}`,
      [
        { text: "Use option A", onPress: () => createGoal(undefined, check.suggestedTargetDateISO) },
        { text: "Use option B", onPress: () => createGoal(check.suggestedAmount) },
        { text: "Keep my original goal", onPress: () => createGoal(), style: "destructive" },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set your goal</Text>

      <Text style={styles.label}>What are you saving for?</Text>
      <TextInput style={styles.input} placeholder="e.g. Emergency fund" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Target amount (₹)</Text>
      <TextInput style={styles.input} placeholder="100000" keyboardType="numeric" value={targetAmount} onChangeText={setTargetAmount} />

      <Text style={styles.label}>Amount you're starting with (₹)</Text>
      <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={startAmount} onChangeText={setStartAmount} />

      <Text style={styles.label}>Target date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-12-31" value={targetDate} onChangeText={setTargetDate} />

      <Text style={styles.label}>Monthly income (₹)</Text>
      <TextInput style={styles.input} placeholder="20000" keyboardType="numeric" value={monthlyIncome} onChangeText={setMonthlyIncome} />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Create goal"}</Text>
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
  button: {
    backgroundColor: "#0F6E56",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
