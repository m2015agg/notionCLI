#!/usr/bin/env python3
"""Notion CLI Write Benchmark: CLI vs MCP Server for write operations"""
import json
import subprocess
import time
import os
import sys

BENCH_DIR = os.path.dirname(os.path.abspath(__file__))
EVAL_FILE = os.path.join(BENCH_DIR, "eval_metadata_write.json")
WITH_DIR = os.path.join(BENCH_DIR, "with_skill_write")
WITHOUT_DIR = os.path.join(BENCH_DIR, "without_skill_write")
PROJECT_DIR = "/home/matt/bibleai"

os.makedirs(WITH_DIR, exist_ok=True)
os.makedirs(WITHOUT_DIR, exist_ok=True)

with open(EVAL_FILE) as f:
    meta = json.load(f)

evals = meta["evals"]
runs = meta["runs_per_eval"]
with_instructions = meta["with_skill_instructions"]
without_instructions = meta["without_skill_instructions"]
cleanup_prompt = meta["cleanup_prompt"]

def run_claude(prompt, allowed_tools, max_turns=10):
    """Run claude -p and return (response, duration_ms)"""
    start = time.time()
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "sonnet",
             "--max-turns", str(max_turns), "--allowedTools", allowed_tools],
            capture_output=True, text=True, timeout=180, cwd=PROJECT_DIR
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

def cleanup(mode="cli"):
    """Clean up benchmark artifacts from Notion"""
    if mode == "cli":
        tools = "Bash(notion-cli *)"
        instructions = "You have notion-cli installed. Use `notion-cli search` to find items and `notion-cli pages update <id> --archive --json` to archive them."
    else:
        tools = "mcp__notion__*"
        instructions = "You have the Notion MCP server connected. Use notion-search to find items and notion-update-page to archive them."

    print("  Cleaning up...", end=" ", flush=True)
    resp, dur = run_claude(f"{instructions}\n\n{cleanup_prompt}", tools, max_turns=15)
    print(f"done ({dur}ms)")
    return resp

total = len(evals) * runs * 2
print(f"=== Notion CLI Write Benchmark ===")
print(f"Evals: {len(evals)} | Runs: {runs} | Total: {total}")
print(f"NOTE: Write evals run sequentially (each depends on prior state)")
print()

modes = sys.argv[1:] if len(sys.argv) > 1 else ["with", "without"]

if "with" in modes:
    print("--- WITH SKILL (CLI) ---")
    for r in range(1, runs + 1):
        print(f"\n  === Run {r}/{runs} ===")
        # Clean slate
        cleanup("cli")

        for ev in evals:
            prompt = f"{with_instructions}\n\n{ev['prompt']}"
            print(f"  {ev['id']}...", end=" ", flush=True)
            response, duration_ms = run_claude(prompt, "Bash(notion-cli *)")
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

        # Cleanup after run
        cleanup("cli")
    print()

if "without" in modes:
    print("--- WITHOUT SKILL (MCP Server) ---")
    for r in range(1, runs + 1):
        print(f"\n  === Run {r}/{runs} ===")
        cleanup("mcp")

        for ev in evals:
            prompt = f"{without_instructions}\n\n{ev['prompt']}"
            print(f"  {ev['id']}...", end=" ", flush=True)
            response, duration_ms = run_claude(prompt, "mcp__notion__*", max_turns=15)
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

        # Cleanup after run
        cleanup("mcp")
    print()

print("=== Write Benchmark Complete ===")
