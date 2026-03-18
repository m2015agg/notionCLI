#!/bin/bash
# Notion CLI Benchmark: CLI Cache vs MCP Server
set -e

BENCH_DIR="$(cd "$(dirname "$0")" && pwd)"
EVAL_FILE="$BENCH_DIR/eval_metadata.json"
WITH_DIR="$BENCH_DIR/with_skill"
WITHOUT_DIR="$BENCH_DIR/without_skill"

# Read evals
EVAL_COUNT=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(len(d['evals']))")
RUNS=3

echo "=== Notion CLI Benchmark ==="
echo "Evals: $EVAL_COUNT | Runs per eval: $RUNS"
echo "Total: $((EVAL_COUNT * RUNS * 2)) runs"
echo ""

# Run with_skill (CLI cache)
echo "--- WITH SKILL (CLI Cache) ---"
for i in $(seq 0 $((EVAL_COUNT - 1))); do
  EVAL_ID=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['evals'][$i]['id'])")
  EVAL_PROMPT=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['evals'][$i]['prompt'])")
  SKILL_INSTRUCTIONS=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['with_skill_instructions'])")

  for r in $(seq 1 $RUNS); do
    OUT_FILE="$WITH_DIR/${EVAL_ID}_run${r}.json"
    echo "  Running: $EVAL_ID (run $r)..."

    START=$(date +%s%N)
    RESPONSE=$(cd /home/matt/bibleai && claude -p "$SKILL_INSTRUCTIONS

$EVAL_PROMPT" --model claude-sonnet-4-5-20250514 --max-turns 5 --allowedTools "Bash(notion-cli *)" 2>/dev/null || echo "ERROR: CLI call failed")
    END=$(date +%s%N)
    DURATION_MS=$(( (END - START) / 1000000 ))

    python3 -c "
import json, sys
data = {
    'eval_id': '$EVAL_ID',
    'run': $r,
    'mode': 'with_skill',
    'response': '''$( echo "$RESPONSE" | python3 -c "import sys; print(sys.stdin.read().replace(\"'\",\"\\\\'\"))" )''',
    'duration_ms': $DURATION_MS
}
json.dump(data, open('$OUT_FILE', 'w'), indent=2)
print(f'    ✓ {$DURATION_MS}ms')
"
  done
done

echo ""
echo "--- WITHOUT SKILL (MCP Server) ---"
for i in $(seq 0 $((EVAL_COUNT - 1))); do
  EVAL_ID=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['evals'][$i]['id'])")
  EVAL_PROMPT=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['evals'][$i]['prompt'])")
  MCP_INSTRUCTIONS=$(python3 -c "import json; d=json.load(open('$EVAL_FILE')); print(d['without_skill_instructions'])")

  for r in $(seq 1 $RUNS); do
    OUT_FILE="$WITHOUT_DIR/${EVAL_ID}_run${r}.json"
    echo "  Running: $EVAL_ID (run $r)..."

    START=$(date +%s%N)
    RESPONSE=$(cd /home/matt/bibleai && claude -p "$MCP_INSTRUCTIONS

$EVAL_PROMPT" --model claude-sonnet-4-5-20250514 --max-turns 10 --allowedTools "mcp__notion__*" 2>/dev/null || echo "ERROR: MCP call failed")
    END=$(date +%s%N)
    DURATION_MS=$(( (END - START) / 1000000 ))

    python3 -c "
import json, sys
data = {
    'eval_id': '$EVAL_ID',
    'run': $r,
    'mode': 'without_skill',
    'response': '''$( echo "$RESPONSE" | python3 -c "import sys; print(sys.stdin.read().replace(\"'\",\"\\\\'\"))" )''',
    'duration_ms': $DURATION_MS
}
json.dump(data, open('$OUT_FILE', 'w'), indent=2)
print(f'    ✓ {$DURATION_MS}ms')
"
  done
done

echo ""
echo "=== Benchmark Complete ==="
echo "Results in: $WITH_DIR/ and $WITHOUT_DIR/"
