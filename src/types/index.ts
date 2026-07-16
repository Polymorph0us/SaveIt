export type IncomeFrequency = "monthly" | "irregular";
export type GoalStatus = "active" | "achieved" | "abandoned" | "adjusted";
export type TransactionSource = "manual" | "bank_sync";

export interface Profile {
  id: string;
  full_name: string | null;
  currency_code: string;
  avg_monthly_income: number;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  frequency: IncomeFrequency;
  received_on: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  start_amount: number;
  target_date: string; // ISO date, e.g. "2026-12-31"
  status: GoalStatus;
  created_at: string;
}

export interface BufferState {
  goal_id: string;
  buffer_amount: number;
  seed_amount: number;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  goal_id: string | null;
  category_id: string | null;
  amount: number;
  note: string | null;
  is_recurring: boolean;
  recurring_active: boolean;
  occurred_on: string;
  source: TransactionSource;
  created_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  goal_id: string | null;
  content: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export type ProbabilityLevel = "on_track" | "at_risk" | "off_track";
