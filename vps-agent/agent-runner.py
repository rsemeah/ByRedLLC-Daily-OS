#!/usr/bin/env python3
"""
Penn Enterprises Autonomous Ops Agent
Runs 24/7 on VPS. Executes scheduled tasks, calls DeepSeek for analysis,
logs everything to SQLite.
"""

import json
import logging
import os
import signal
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "agent.db"
CONFIG_PATH = BASE_DIR / "config.yaml"
LOG_PATH = BASE_DIR / "agent.log"

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

shutdown_requested = False


def handle_signal(signum, frame):
    global shutdown_requested
    logging.info("Shutdown signal received (%s). Finishing current cycle...", signum)
    shutdown_requested = True


signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)


def setup_logging():
    fmt = "%(asctime)s  %(levelname)-8s  %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_PATH, encoding="utf-8"),
        ],
    )


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS task_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_name TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT DEFAULT 'running',
            result_summary TEXT,
            raw_output TEXT,
            ai_analysis TEXT,
            error TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS task_schedule (
            task_name TEXT PRIMARY KEY,
            last_run_at TEXT
        )
    """)
    conn.commit()
    return conn


def get_last_run(conn, task_name):
    row = conn.execute(
        "SELECT last_run_at FROM task_schedule WHERE task_name = ?",
        (task_name,),
    ).fetchone()
    if row and row[0]:
        return datetime.fromisoformat(row[0])
    return None


def update_last_run(conn, task_name, ts):
    conn.execute(
        "INSERT OR REPLACE INTO task_schedule (task_name, last_run_at) VALUES (?, ?)",
        (task_name, ts.isoformat()),
    )
    conn.commit()


def log_run(conn, task_name, started, finished, status, summary, raw, ai, error=None):
    conn.execute(
        """INSERT INTO task_runs
           (task_name, started_at, finished_at, status, result_summary, raw_output, ai_analysis, error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (task_name, started.isoformat(), finished.isoformat(), status, summary, raw, ai, error),
    )
    conn.commit()


def call_deepseek(api_key, model, system_prompt, user_prompt, max_tokens=300):
    resp = requests.post(
        DEEPSEEK_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "model": model,
            "temperature": 0.3,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def run_shell(cmd, timeout=30):
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        output = result.stdout.strip()
        if result.returncode != 0 and result.stderr.strip():
            output += f"\nSTDERR: {result.stderr.strip()}"
        return output
    except subprocess.TimeoutExpired:
        return f"TIMEOUT: command exceeded {timeout}s"
    except Exception as e:
        return f"ERROR: {e}"


def execute_task(task, api_key, model):
    """Run a single task and return (raw_output, ai_analysis)."""
    task_type = task.get("type", "ai_only")
    raw_output = ""

    if task_type in ("shell", "shell_then_ai"):
        cmd = task.get("command", "echo 'no command configured'")
        raw_output = run_shell(cmd, timeout=task.get("timeout", 30))

    if task_type in ("http_check", "http_then_ai"):
        url = task.get("url", "")
        try:
            r = requests.get(url, timeout=15, allow_redirects=True)
            raw_output = f"HTTP {r.status_code} — {len(r.content)} bytes — {r.elapsed.total_seconds():.2f}s"
        except Exception as e:
            raw_output = f"HTTP FAIL: {e}"

    system_prompt = (
        "You are PennOps, the autonomous operations agent for Penn Enterprises LLC, "
        "an AI automation agency. You analyze system data and provide brief, actionable insights. "
        "Be direct. Flag anything that needs attention. Keep responses under 100 words."
    )

    user_prompt = task.get("prompt", "Summarize the current status.")
    if raw_output:
        user_prompt += f"\n\nRaw data:\n{raw_output}"

    ai_analysis = call_deepseek(api_key, model, system_prompt, user_prompt)

    return raw_output, ai_analysis


def is_task_due(conn, task):
    interval_minutes = task.get("interval_minutes", 60)
    last_run = get_last_run(conn, task["name"])
    if last_run is None:
        return True
    elapsed = (datetime.now(timezone.utc) - last_run.replace(tzinfo=timezone.utc)).total_seconds()
    return elapsed >= interval_minutes * 60


def run_cycle(conn, config, api_key):
    model = config.get("agent", {}).get("model", "deepseek-chat")
    tasks = config.get("tasks", [])

    for task in tasks:
        if shutdown_requested:
            break
        if not task.get("enabled", True):
            continue
        if not is_task_due(conn, task):
            continue

        task_name = task["name"]
        logging.info("▶ Starting: %s", task_name)
        started = datetime.now(timezone.utc)

        try:
            raw_output, ai_analysis = execute_task(task, api_key, model)
            finished = datetime.now(timezone.utc)
            summary = ai_analysis[:200] if ai_analysis else raw_output[:200]

            log_run(conn, task_name, started, finished, "success", summary, raw_output, ai_analysis)
            update_last_run(conn, task_name, finished)
            logging.info("✓ Completed: %s", task_name)
            logging.info("  Insight: %s", summary[:120])

        except Exception as e:
            finished = datetime.now(timezone.utc)
            log_run(conn, task_name, started, finished, "error", None, None, None, str(e))
            update_last_run(conn, task_name, finished)
            logging.error("✗ Failed: %s — %s", task_name, e)


def main():
    setup_logging()
    logging.info("=" * 60)
    logging.info("PennOps Agent starting")
    logging.info("=" * 60)

    config = load_config()
    agent_cfg = config.get("agent", {})
    loop_interval = agent_cfg.get("loop_interval_seconds", 300)

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        logging.error("DEEPSEEK_API_KEY not set. Export it in ~/.bashrc and retry.")
        sys.exit(1)

    conn = init_db()
    logging.info("DB ready at %s", DB_PATH)
    logging.info("Loop interval: %ds", loop_interval)
    logging.info("Tasks loaded: %d", len(config.get("tasks", [])))

    while not shutdown_requested:
        try:
            run_cycle(conn, config, api_key)
        except Exception as e:
            logging.error("Cycle error: %s", e)

        if not shutdown_requested:
            logging.info("Sleeping %ds until next cycle...", loop_interval)
            for _ in range(loop_interval):
                if shutdown_requested:
                    break
                time.sleep(1)

    logging.info("PennOps Agent stopped gracefully.")
    conn.close()


if __name__ == "__main__":
    main()
