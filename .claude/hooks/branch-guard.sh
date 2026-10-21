#!/bin/sh
# PreToolUse guard for Edit/Write: refuse to edit while on main or on a branch already merged into origin/main.
# Claude must branch off a fresh origin/main first (see CLAUDE.md, "Git workflow"). Exit 2 = block, message goes back to Claude.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
b=$(git branch --show-current)
[ -z "$b" ] && exit 0
if [ "$b" = "main" ]; then
  echo "On main. Run: git fetch origin && git checkout -b <feat|fix|chore>/<short-name> origin/main && git push -u origin HEAD, then edit." >&2; exit 2
fi
git fetch -q origin main 2>/dev/null
if git merge-base --is-ancestor HEAD origin/main 2>/dev/null && [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Branch '$b' is already merged into origin/main. Cut a new branch from origin/main before editing." >&2; exit 2
fi
exit 0
