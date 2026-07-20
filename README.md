# FI Goal — savings tracker

A goal-based savings app: set a target amount + date, log expenses daily,
and a hidden buffer absorbs overspending and recalculates your daily
spending limit instead of just flagging you when you go over.

> **Before running the autonomous loop for the first time:** go through
> "Completed" below and check off whatever opencode has already built —
> the agent trusts this list as ground truth and will skip anything
> already checked.

## Stack (verified, do not guess a replacement version)

- Expo SDK `~56.0.16`, React Native `0.85.3`, React `19.2.3`
- `react-native-screens` `4.25.2`, `react-native-safe-area-context` `~5.7.0`,
  `@react-native-async-storage/async-storage` `2.2.0` — pinned to exactly
  what Expo Go's SDK 56 build ships with; anything else throws
  "native module is null"
- If UI/animation work is in progress: `react-native-reanimated@4.3.1`,
  `react-native-gesture-handler@~2.31.1`, `react-native-svg@15.15.4`,
  `expo-haptics@~56.0.3`, `expo-font@~56.0.7` — same rule, these are
  SDK-56-verified, don't bump without re-checking
- Supabase (Postgres + Auth + RLS), React Navigation v7

Full rules for changing any of the above live in `AGENTS.md`, not here.

## Setup (for humans)

```bash
cp .env.example .env        # then fill in your Supabase URL + anon key
npm install                 # zero flags — tree is self-consistent
npx expo start
```

Database: paste `supabase/schema.sql` into Supabase's SQL Editor and run it
once, before first use.

## Verification gate

A task isn't done until all three pass:
```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```
`expo export` is the fast, deviceless way to catch import/Babel/dependency
errors — it bundles the real app and exits with a real pass/fail code.
Prefer it over trying to read a live `expo start` session for debugging.

## Completed

*(Check these off to match reality before starting an autonomous run —
this list is what the agent trusts, not what it re-derives.)*

- [x] Auth, goal creation with realism check, manual expense logging
- [x] Hidden buffer algorithm (`src/utils/budgetEngine.ts`)
- [ ] On-track/at-risk/off-track probability indicator
- [ ] Real date picker (replacing plain YYYY-MM-DD text field)
- [ ] Shared `useGoalSummary()` hook (currently duplicated between
      HomeScreen and LogExpenseScreen)
- [ ] Weekly AI insight digest (Supabase Edge Function)
- [ ] Recurring-expense deactivation
- [ ] UI redesign: custom type/spacing scale, real accent identity, loaded
      font, no default `<Button>`/generic shadow cards
- [ ] Circular progress ring for goal completion (svg + reanimated)
- [ ] Animated number transitions (daily limit, savings, probability score)
- [ ] Pressed states + haptics on interactive elements
- [ ] Custom screen/modal transitions

## Roadmap

*(Task queue for the autonomous loop — first unchecked item, top to
bottom, is next. The agent checks items off itself and adds one line
under "Completed" describing the change after each one passes the
verification gate.)*

- [ ] Indian lakh/crore number formatting (₹1,00,000 not ₹100,000)
- [ ] Streaks: consecutive days under daily limit
- [ ] Biometric app lock (`expo-local-authentication`)
- [ ] Weekly/monthly category breakdown chart
- [ ] What-if goal simulator (slider, reuses `budgetEngine.ts` — no backend
      changes needed)
- [ ] Sub-budgets per category
- [ ] Local notification reminders for recurring bills
- [ ] Round-up savings into the hidden buffer
- [ ] Shareable progress card export (`react-native-view-shot`)
- [ ] Dark mode
- [ ] Multiple simultaneous goals with income allocation split
- [ ] CSV/PDF export of transaction history

## Blocked

*(The agent writes here if something fails verification 3 times in a
row on the same task, instead of retrying forever. Human review needed
on anything listed here.)*

*(nothing yet)*
