#!/bin/bash
set -e
cd "$(dirname "$0")"

MAX_ITERATIONS=20
i=0

while [ $i -lt $MAX_ITERATIONS ]; do
  if ! grep -q '^\- \[ \]' README.md; then
    echo "No unchecked roadmap items left. Stopping."
    break
  fi

  echo "=== Iteration $((i+1)) — $(date) ==="
  opencode run "Follow the Autonomous Execution Protocol in AGENTS.md exactly. Pick the next unchecked item in README.md's Roadmap section, implement it fully, run the full verification gate, and only commit if all three checks pass. Update README.md's Completed and Roadmap sections accordingly."

  i=$((i+1))
  sleep 60
done

echo "Autopilot finished after $i iteration(s)."
git log --oneline -n "$i"
