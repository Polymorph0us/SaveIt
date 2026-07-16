/**
 * budgetEngine.ts
 *
 * This is the heart of the app: pure, testable functions with no
 * dependency on React Native or Supabase. Screens call these functions
 * and then persist the results.
 *
 * Core idea: the user never sees a raw "buffer" number. They only see
 * a daily spending limit and an on-track status. The buffer absorbs
 * shocks quietly in the background.
 */

import type { ProbabilityLevel } from "../types";

// ---------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// 1. Daily spending limit
// ---------------------------------------------------------------

export interface DailyLimitInput {
  targetAmount: number;
  currentSavings: number; // start_amount + everything saved so far
  targetDateISO: string;
  avgDailyIncome: number;
  todayISO: string;
}

export interface DailyLimitResult {
  remainingAmount: number;
  remainingDays: number;
  requiredDailySavings: number;
  dailySpendingLimit: number;
}

/**
 * Recomputed every time an expense is logged, or a day rolls over.
 * This is intentionally the ONLY place "how much can I spend today"
 * gets calculated, so the buffer logic and the UI never disagree.
 */
export function calcDailyLimit(input: DailyLimitInput): DailyLimitResult {
  const remainingAmount = Math.max(input.targetAmount - input.currentSavings, 0);
  const remainingDays = Math.max(daysBetween(input.todayISO, input.targetDateISO), 1);
  const requiredDailySavings = remainingAmount / remainingDays;
  const dailySpendingLimit = Math.max(input.avgDailyIncome - requiredDailySavings, 0);

  return { remainingAmount, remainingDays, requiredDailySavings, dailySpendingLimit };
}

// ---------------------------------------------------------------
// 2. Hidden buffer
// ---------------------------------------------------------------

/**
 * Seed the buffer when a goal is created. 12% of monthly income gives
 * roughly 3-4 days of full cushion before the user notices anything —
 * enough to absorb a bad week without immediately flagging risk.
 */
export function seedBuffer(avgMonthlyIncome: number): number {
  return Math.round(avgMonthlyIncome * 0.12);
}

export interface BufferUpdateInput {
  todaySpend: number;
  dailyLimit: number;
  currentBuffer: number;
}

export interface BufferUpdateResult {
  newBuffer: number;
  overspendAmount: number; // 0 if under/at limit
  bufferDelta: number; // positive = grew, negative = shrank
}

/**
 * Called right after a transaction is inserted. Never shows the user
 * "you went X over" in isolation — the overspend gets folded into the
 * buffer, and the *next* daily limit recompute is what the user sees.
 */
export function updateBuffer(input: BufferUpdateInput): BufferUpdateResult {
  const diff = input.dailyLimit - input.todaySpend; // positive = under budget

  if (diff >= 0) {
    // Under or at limit: a portion of the surplus tops the buffer back up.
    // (Not all of it — some stays "spendable slack" so the app doesn't
    // feel like it's punishing good days by hoarding everything.)
    const bufferDelta = diff * 0.5;
    return {
      newBuffer: input.currentBuffer + bufferDelta,
      overspendAmount: 0,
      bufferDelta,
    };
  }

  const overspend = Math.abs(diff);
  const bufferDelta = -overspend;
  return {
    newBuffer: Math.max(input.currentBuffer + bufferDelta, 0),
    overspendAmount: overspend,
    bufferDelta,
  };
}

// ---------------------------------------------------------------
// 3. Predictive probability score
// ---------------------------------------------------------------

export interface ProbabilityInput {
  requiredDailySavings: number;
  trailingAvgDailySpend: number; // e.g. average of last 7 days
  avgDailyIncome: number;
  bufferAmount: number;
  seedBufferAmount: number;
}

export interface ProbabilityResult {
  level: ProbabilityLevel;
  score: number; // 0-100, rough indicator only — not a real statistical probability
}

/**
 * Deliberately simple for v1: a traffic-light score blending (a) whether
 * the user's actual trailing spend rate leaves enough room to save what's
 * required, and (b) how much of the hidden buffer is left as cushion.
 * A real model (e.g. Monte Carlo over spending variance) is a good v2
 * upgrade once there's a few months of real transaction history.
 */
export function calcProbability(input: ProbabilityInput): ProbabilityResult {
  const actualDailySavings = input.avgDailyIncome - input.trailingAvgDailySpend;
  const paceRatio =
    input.requiredDailySavings <= 0
      ? 1
      : Math.min(actualDailySavings / input.requiredDailySavings, 1.5) / 1.5;

  const bufferRatio =
    input.seedBufferAmount <= 0
      ? 1
      : Math.min(input.bufferAmount / input.seedBufferAmount, 1);

  const score = Math.round((paceRatio * 0.7 + bufferRatio * 0.3) * 100);

  let level: ProbabilityLevel = "off_track";
  if (score >= 75) level = "on_track";
  else if (score >= 45) level = "at_risk";

  return { level, score: Math.max(0, Math.min(100, score)) };
}

// ---------------------------------------------------------------
// 4. Unrealistic goal detection
// ---------------------------------------------------------------

export interface RealismCheckInput {
  targetAmount: number;
  startAmount: number;
  targetDateISO: string;
  createdDateISO: string;
  monthlyIncome: number;
  // Pass real historical average if available; otherwise the caller
  // should fall back to an assumed savings ceiling (see DEFAULT_MAX_SAVINGS_RATE).
  historicalAvgMonthlyExpense: number | null;
}

export interface RealismCheckResult {
  isRealistic: boolean;
  requiredMonthlySaving: number;
  maxRealisticMonthlySaving: number;
  suggestedTargetDateISO: string; // if they keep the amount fixed
  suggestedAmount: number; // if they keep the date fixed
}

// Used only when there's no spending history yet to base a real number on.
export const DEFAULT_MAX_SAVINGS_RATE = 0.5;

export function checkGoalRealism(input: RealismCheckInput): RealismCheckResult {
  const monthsRemaining = Math.max(
    daysBetween(input.createdDateISO, input.targetDateISO) / 30,
    1 / 30
  );

  const maxRealisticMonthlySaving =
    input.historicalAvgMonthlyExpense != null
      ? Math.max(input.monthlyIncome - input.historicalAvgMonthlyExpense, 0)
      : input.monthlyIncome * DEFAULT_MAX_SAVINGS_RATE;

  const remainingAmount = Math.max(input.targetAmount - input.startAmount, 0);
  const requiredMonthlySaving = remainingAmount / monthsRemaining;

  const isRealistic = requiredMonthlySaving <= maxRealisticMonthlySaving;

  // Alternative 1: keep amount fixed, push the date out.
  const monthsNeeded =
    maxRealisticMonthlySaving > 0
      ? remainingAmount / maxRealisticMonthlySaving
      : Number.POSITIVE_INFINITY;
  const suggestedDate = new Date(input.createdDateISO + "T00:00:00");
  suggestedDate.setDate(
    suggestedDate.getDate() + Math.ceil(monthsNeeded * 30)
  );
  const suggestedTargetDateISO = suggestedDate.toISOString().slice(0, 10);

  // Alternative 2: keep the date fixed, lower the amount.
  const suggestedAmount = Math.round(
    input.startAmount + maxRealisticMonthlySaving * monthsRemaining
  );

  return {
    isRealistic,
    requiredMonthlySaving: Math.round(requiredMonthlySaving),
    maxRealisticMonthlySaving: Math.round(maxRealisticMonthlySaving),
    suggestedTargetDateISO,
    suggestedAmount,
  };
}
