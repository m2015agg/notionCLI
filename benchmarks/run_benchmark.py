#!/usr/bin/env python3
"""Notion CLI Benchmark: CLI Cache vs MCP Server"""
import json
import subprocess
import time
import os
import sys

BENCH_DIR = os.path.dirname(os.path.abspath(__file__))
EVAL_FILE = os.path.join(BENCH_DIR, "eval_metadata.json")
WITH_DIR = os.path.join(BENCH_DIR, "with_skill")
WITHOUT_DIR = os.path.join(BENCH_DIR, "without_skill")
PROJECT_DIR = "/home/matt/bibleai"

os.makedirs(WITH_DIR, exist_ok=True)
os.makedirs(WITHOUT_DIR, exist_ok=True)

with open(EVAL_FILE) as f:
    meta = json.load(f)

evals = meta["evals"]
runs = meta["runs_per_eval"]
with_instructions = meta["with_skill_instructions"]
without_instructions = meta["without_skill_instructions"]

def run_claude(prompt, allowed_tools, max_turns=5):
    """Run claude -p and return (response, duration_ms)"""
    start = time.time()
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "sonnet",
             "--max-turns", str(max_turns), "--allowedTools", allowed_tools],
            capture_output=True, text=True, timeout=120, cwd=PROJECT_DIR
        )
        response = result.stdout.strip()
        if not response:
            response = f"EMPTY (stderr: {result.stderr[:200]})"
    except subprocess.TimeoutExpired:
        response = "TIMEOUT"
    except Exception as e:
        response = f"ERROR: {e}"
    duration_ms = int((time.time() - start) * 1000)
    return response, duration_ms

total = len(evals) * runs * 2
print(f"=== Notion CLI Benchmark ===")
print(f"Evals: {len(evals)} | Runs: {runs} | Total: {total}")
print()

# Mode selection from args
modes = sys.argv[1:] if len(sys.argv) > 1 else ["with", "without"]

if "with" in modes:
    print("--- WITH SKILL (CLI Cache) ---")
    for ev in evals:
        for r in range(1, runs + 1):
            prompt = f"{with_instructions}\n\n{ev['prompt']}"
            print(f"  {ev['id']} run {r}...", end=" ", flush=True)
            response, duration_ms = run_claude(prompt, "Bash(notion-cli *)", max_turns=10)
            out = {
                "eval_id": ev["id"],
                "run": r,
                "mode": "with_skill",
                "response": response,
                "duration_ms": duration_ms,
            }
            out_file = os.path.join(WITH_DIR, f"{ev['id']}_run{r}.json")
            with open(out_file, "w") as f:
                json.dump(out, f, indent=2)
            print(f"✓ {duration_ms}ms")
    print()

if "without" in modes:
    print("--- WITHOUT SKILL (MCP Server) ---")
    for ev in evals:
        for r in range(1, runs + 1):
            prompt = f"{without_instructions}\n\n{ev['prompt']}"
            print(f"  {ev['id']} run {r}...", end=" ", flush=True)
            response, duration_ms = run_claude(prompt, "mcp__notion__*", max_turns=10)
            out = {
                "eval_id": ev["id"],
                "run": r,
                "mode": "without_skill",
                "response": response,
                "duration_ms": duration_ms,
            }
            out_file = os.path.join(WITHOUT_DIR, f"{ev['id']}_run{r}.json")
            with open(out_file, "w") as f:
                json.dump(out, f, indent=2)
            print(f"✓ {duration_ms}ms")
    print()

print("=== Benchmark Complete ===")
