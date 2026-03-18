#!/bin/bash
LOG="/c/Users/b8112/haosuan/loop.log"
cd /c/Users/b8112/haosuan

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Loop starting" >> "$LOG"

CLAUDECODE= CLAUDE_CODE_ENTRYPOINT= \
  /c/Users/b8112/.local/bin/claude.exe \
  --dangerously-skip-permissions \
  "請讀取 LOOP_PROMPT.md 並執行下一個任務" \
  --allowedTools "Bash,Read,Write,Edit,MultiEdit,Glob,Grep,TodoRead,TodoWrite" \
  --model sonnet >> "$LOG" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Loop finished (exit code: $?)" >> "$LOG"
