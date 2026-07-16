---
name: verify-before-done
description: Use before declaring any coding task complete in this repo. Runs the required verification gate (typecheck, expo-doctor, bundle export) and reports pass/fail honestly.
---
Run, in order, and report the real output of each — do not summarize as
"passed" without showing the command's actual exit status:
1. npx tsc --noEmit
2. npx expo-doctor
3. npx expo export --platform android
If any fail, fix and re-run all three from the top before reporting done.
