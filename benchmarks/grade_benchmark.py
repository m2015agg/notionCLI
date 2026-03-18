#!/usr/bin/env python3
"""Grade notion-cli benchmark results using LLM grader"""
import json
import subprocess
import os
import glob
import sys

BENCH_DIR = os.path.dirname(os.path.abspath(__file__))
EVAL_FILE = os.path.join(BENCH_DIR, "eval_metadata.json")

with open(EVAL_FILE) as f:
    meta = json.load(f)

# Build assertion map
assertion_map = {ev["id"]: ev["assertions"] for ev in meta["evals"]}

# Collect all result files
results = []
for mode_dir in ["with_skill", "without_skill"]:
    dir_path = os.path.join(BENCH_DIR, mode_dir)
    for f in sorted(glob.glob(os.path.join(dir_path, "*.json"))):
        if "grading" not in f:
            with open(f) as fh:
                results.append(json.load(fh))

print(f"Grading {len(results)} results...")

graded = []
for r in results:
    eval_id = r["eval_id"]
    assertions = assertion_map.get(eval_id, [])
    response = r["response"]

    # Build grading prompt
    grading_prompt = f"""Grade this AI response. Score each assertion as PASS or FAIL.

ASSERTIONS:
{chr(10).join(f'  {i+1}. {a}' for i, a in enumerate(assertions))}

RESPONSE:
{response[:3000]}

Reply in EXACTLY this JSON format, nothing else:
{{"assertions": [{{"assertion": "...", "pass": true/false, "reason": "..."}}], "quality": 1-5, "summary": "one line"}}"""

    try:
        result = subprocess.run(
            ["claude", "-p", grading_prompt, "--model", "sonnet",
             "--max-turns", "1"],
            capture_output=True, text=True, timeout=60, cwd="/home/matt/bibleai"
        )
        raw = result.stdout.strip()

        # Extract JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            grade = json.loads(json_match.group())
        else:
            grade = {"assertions": [], "quality": 0, "summary": "Failed to parse grader output"}
    except Exception as e:
        grade = {"assertions": [], "quality": 0, "summary": f"Grader error: {e}"}

    passed = sum(1 for a in grade.get("assertions", []) if a.get("pass"))
    total = len(grade.get("assertions", []))

    graded.append({
        "eval_id": eval_id,
        "run": r["run"],
        "mode": r["mode"],
        "duration_ms": r["duration_ms"],
        "pass_rate": passed / total if total > 0 else 0,
        "quality": grade.get("quality", 0),
        "summary": grade.get("summary", ""),
        "assertions": grade.get("assertions", [])
    })

    status = "PASS" if passed == total else f"PARTIAL ({passed}/{total})"
    print(f"  {r['mode']:15} {eval_id:25} run {r['run']} → {status} quality={grade.get('quality',0)} {r['duration_ms']}ms")

# Save grading results
grading_file = os.path.join(BENCH_DIR, "grading.json")
with open(grading_file, "w") as f:
    json.dump(graded, f, indent=2)

# Aggregate
print("\n=== AGGREGATE RESULTS ===")
for mode in ["with_skill", "without_skill"]:
    mode_results = [g for g in graded if g["mode"] == mode]
    if not mode_results:
        continue
    avg_pass = sum(g["pass_rate"] for g in mode_results) / len(mode_results)
    avg_quality = sum(g["quality"] for g in mode_results) / len(mode_results)
    avg_time = sum(g["duration_ms"] for g in mode_results) / len(mode_results)
    print(f"\n  {mode}:")
    print(f"    Pass rate:  {avg_pass:.0%}")
    print(f"    Quality:    {avg_quality:.1f}/5")
    print(f"    Avg time:   {avg_time:.0f}ms")

# Per-eval breakdown
print("\n=== PER-EVAL BREAKDOWN ===")
print(f"{'Eval':<25} {'CLI Pass':>10} {'CLI Time':>10} {'MCP Pass':>10} {'MCP Time':>10} {'Speedup':>10}")
print("-" * 80)
for ev in meta["evals"]:
    eid = ev["id"]
    cli = [g for g in graded if g["eval_id"] == eid and g["mode"] == "with_skill"]
    mcp = [g for g in graded if g["eval_id"] == eid and g["mode"] == "without_skill"]

    cli_pass = f"{sum(g['pass_rate'] for g in cli)/len(cli):.0%}" if cli else "N/A"
    cli_time = f"{sum(g['duration_ms'] for g in cli)/len(cli):.0f}ms" if cli else "N/A"
    mcp_pass = f"{sum(g['pass_rate'] for g in mcp)/len(mcp):.0%}" if mcp else "N/A"
    mcp_time = f"{sum(g['duration_ms'] for g in mcp)/len(mcp):.0f}ms" if mcp else "N/A"

    if cli and mcp:
        speedup = f"{sum(g['duration_ms'] for g in mcp)/sum(g['duration_ms'] for g in cli):.1f}x"
    else:
        speedup = "N/A"

    print(f"{eid:<25} {cli_pass:>10} {cli_time:>10} {mcp_pass:>10} {mcp_time:>10} {speedup:>10}")

print(f"\nResults saved to {grading_file}")
