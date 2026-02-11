#!/bin/bash
# Auto-store git commit as neural memory
# Called from .git/hooks/post-commit

COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_HASH=$(git log -1 --pretty=%h)
COMMIT_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ', ')

# Detect nmem command
if command -v nmem &>/dev/null; then
    NMEM="nmem"
elif command -v python3 &>/dev/null; then
    NMEM='python3 -c "from neural_memory.cli import app; app()" --'
elif command -v python &>/dev/null; then
    NMEM='python -c "from neural_memory.cli import app; app()" --'
else
    exit 0
fi

# Determine memory type from commit prefix
TYPE="fact"
if echo "$COMMIT_MSG" | grep -qi "^fix:"; then
    TYPE="error"
elif echo "$COMMIT_MSG" | grep -qi "^feat:"; then
    TYPE="decision"
elif echo "$COMMIT_MSG" | grep -qi "^refactor:"; then
    TYPE="workflow"
elif echo "$COMMIT_MSG" | grep -qi "^perf:"; then
    TYPE="insight"
fi

# Determine priority
PRIORITY=5
if echo "$COMMIT_MSG" | grep -qi "CRITICAL\|BREAKING\|HOTFIX"; then
    PRIORITY=9
elif echo "$COMMIT_MSG" | grep -qi "^fix:"; then
    PRIORITY=7
elif echo "$COMMIT_MSG" | grep -qi "^feat:"; then
    PRIORITY=6
fi

# Store memory
eval $NMEM remember "\"Commit ${COMMIT_HASH}: ${COMMIT_MSG} [files: ${COMMIT_FILES}]\"" \
    --type "$TYPE" \
    --priority "$PRIORITY" \
    --tag "git-commit" 2>/dev/null

echo "  nmem: stored as ${TYPE} (priority ${PRIORITY})"
