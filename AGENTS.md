# AGENTS.md

## Overview

This is a React Native/Expo app targeting SDK 56, specifically designed to work with Expo Go from the Play Store. Built from Expo's official SDK 56 TypeScript template with Supabase as the backend.

## Critical Safety Checks

This project won't work if you guess the wrong version:
- Expo must be exactly `~56.0.16` (not newer SDK 57)
- React Native must be `0.85.3` 
- React must be `19.2.3`
- These match what's currently live in Expo Go on the Play Store

## Verification Gate (mandatory)

A task is not complete until you have actually run these three commands
yourself and confirmed zero new errors — do not report success without
showing the real output:
1. npx tsc --noEmit
2. npx expo-doctor — failures are acceptable ONLY if the error is a
   network/JSON-parse error reaching Expo's schema or directory servers
   (sandboxed environments block this). Any other failure is real and
   must be fixed before continuing.
3. npx expo export --platform android
If any fail, fix and re-run all three from the top.

## Setup

### Main Commands

```bash
# Local dev server - launches Expo CLI with Metro bundler
cp .env.example .env
npm install  # Zero flags - dependency tree is self-consistent
npx expo start
```

### Database

1. Go to Supabase dashboard → Project Settings → API
2. Copy Project URL and anon key into `.env` (the `.env.example` provides the template)
3. In Supabase SQL Editor, run the entire contents of `supabase/schema.sql`
4. Start the app and scan the QR code with Expo Go on your phone

## Architecture

### Entry Points
- `App.tsx` - Main entry point, handles auth state + Supabase configuration screen
- `src/navigation/AppNavigator.tsx` - React Navigation setup for 4 screens
- `src/lib/supabase.ts` - Supabase client with friendly error handling

### Code Organization
- `src/screens/` - One file per screen (AuthScreen.tsx, HomeScreen.tsx, etc.)
- `src/utils/budgetEngine.ts` - Core financial logic (pure functions, no RN/supabase deps)
- `src/types/` - TypeScript types matching the DB schema
- `src/lib/` - Library code with external dependencies

### Navigation Flow
Auth → (GoalSetup | Home) → (LogExpenseModal | Home)
- AuthScreen handles login/signup
- HomeScreen redirects to GoalSetup if user has no active goal
- LogExpenseScreen opens as a modal from HomeScreen

## Configuration

### Expo Config
- `app.json` matches current Expo schema (no old `assetBundlePatterns`, uses three-image `adaptiveIcon`)
- `tsconfig.json` extends "expo/tsconfig.base" with strict typing enabled

### Environment
- `EXPO_PUBLIC_*` vars only exposed to the app (Expo's way)
- `src/lib/supabase.ts` never crashes on missing config - App.tsx shows "Almost there" screen instead

## Core Algorithm

### Budget Engine
- Pure TypeScript functions in `src/utils/budgetEngine.ts`
- No RN/supabase dependencies - testable and reusable
- Calculates daily spending limit, buffer management, and goal achievement probability

### Backend Integration
- Supabase with full PostgreSQL + Row Level Security
- `supabase/schema.sql` includes all tables and RLSPolicies
- Functions auto-seed default categories on user signup
- Every new table added to schema.sql must have RLS enabled and a policy
scoped to auth.uid() — no exceptions.
## Quality & Verification

### Verification Commands
```bash
# Clean install from scratch - should succeed with zero flags
npm install

# Type checking - zero errors expected
type npx tsc --noEmit

### Key Behaviors
- Never throws when `.env` is missing - shows friendly screen
- Uses `gen_random_uuid()` built-in to Postgres (no uuid-ossp extension)
- Auto-manages Supabase auth state with React hooks

## Autonomous Execution Protocol

1. Run npx expo export --platform android > /tmp/build_check.log 2>&1
   If it fails, read the log fully, fix the root cause, re-run until it passes.
   Never proceed to a new task on a broken build.
2. Read README.md's "Roadmap" section. Pick the first unchecked item.
3. Implement it.
4. Run all three, in order — every single one must pass before continuing:
   npx tsc --noEmit
   npx expo-doctor
   npx expo export --platform android
   If any fail: fix and restart this step from the top. Do not commit on failure.
5. git add -A && git commit -m "feat: <description>"
6. Edit README.md: check off the completed roadmap item, add one line under
   "Completed" describing what changed.
7. If the same task fails verification 3 times in a row, stop and leave a
   note in README.md under "Blocked" instead of continuing to burn requests.
8. Repeat from step 2. Stop when no unchecked roadmap items remain.

## Project Quirks

### Build Process
- Modern Expo v56+ with Metro bundler
- Node_modules expected (no alternative setup)
- `.expo/` folder maintained by Expo CLI

### Testing
- No test framework or CI pipeline
- Manual verification via: installation, type checking, bundling

### Dependencies
- `@react-navigation/native` (v7) + `@react-navigation/native-stack`
- `react-native-screens` required for native navigation performance
- Native modules wrapped with Expo

## Common Pitfalls

### Version Mismatch
- Hand-typed `package.json` changes cause "incompatible with this version of Expo Go" errors
- Always use `npx expo install --fix` for SDK upgrades
- Expo Go won't install projects targeting newer SDK than what's in the Play Store
- `npx expo install --fix` needs network access to Expo's compatibility API.
- If it fails (sandboxed/restricted network), fall back to checking manually:
curl -s https://raw.githubusercontent.com/expo/expo/sdk-56/packages/expo/bundledNativeModules.json
- Never guess a native package's version or trust npm's "latest" tag.
### Asset Path Conflicts
- `app.json` referenced missing `./assets/icon.png` in the original version
- Fixed: Now includes real assets from Expo template

### Schema SQL Changes
- Earlier versions used `create extension "uuid-ossp"`
- Fixed: Uses built-in `gen_random_uuid()` to avoid Supabase role issues

### Migration Path
- Upgrading from SDK 56 to 57: Use `npx expo install expo@57 --fix`
- Only upgrade when Expo Go on Play Store shows SDK 57 as current

## Enhancement Roadmap

Based on `README.md`:
- Real date picker instead of plain YYYY-MM-DD text field
- Shared `useGoalSummary()` hook (currently duplicated)
- Weekly AI insight digest via Supabase Edge Function
- Recurring-expense deactivation, multi-goal support, real bank sync
