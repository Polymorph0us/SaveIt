"use client";

import {
  calcDailyLimit,
  calcProbability,
  daysBetween,
  todayISO,
} from "../utils/budgetEngine";
import { formatIndianNumber } from "../utils/numberFormatter";
import type { Goal, BufferState, Transaction } from "../types";
import { supabase } from "../lib/supabase";

export interface GoalSummary {
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

export function useGoalSummary(goalId: string) {
  async function load(): Promise<GoalSummary> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data: goal } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .single();

    if (!goal) {
      throw new Error("Goal not found");
    }

    const { data: buffer } = await supabase
      .from("buffer_state")
      .select("*")
      .eq("goal_id", goalId)
      .single();

    if (!buffer) {
      throw new Error("Buffer not found");
    }

    const { data: incomeRows } = await supabase
      .from("income_sources")
      .select("amount")
      .eq("user_id", user.id)
      .eq("frequency", "monthly");
    const monthlyIncome = (incomeRows ?? []).reduce(
      (s, r) => s + Number(r.amount),
      0
    );
    const avgDailyIncome = monthlyIncome / 30;

    const { data: allTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("goal_id", goalId)
      .order("occurred_on", { ascending: false });

    const transactions = allTx ?? [];
    const today = todayISO();
    const todaySpend = transactions
      .filter((t) => t.occurred_on === today)
      .reduce((s, t) => s + Number(t.amount), 0);

    const daysElapsed = Math.max(
      daysBetween(goal.created_at.slice(0, 10), today),
      0
    );
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
      bufferAmount: Number(buffer.buffer_amount),
      seedBufferAmount: Number(buffer.seed_amount),
    });

    return {
      goal,
      buffer,
      monthlyIncome,
      dailyLimit: dailySpendingLimit,
      todaySpend,
      currentSavings,
      probabilityLevel: level,
      probabilityScore: score,
      recentTransactions: transactions.slice(0, 8),
    };
  }

  return { load };
}

