#!/bin/bash
# Neural Memory Maintenance Script
# Usage: bash scripts/nmem_maintenance.sh
# Runs: decay -> consolidate -> sync brain DB

BRAIN="ai-office-dashboard"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Detect nmem command
if command -v nmem &>/dev/null; then
    NMEM="nmem"
elif command -v python3 &>/dev/null; then
    NMEM='python3 -c "from neural_memory.cli import app; app()" --'
elif command -v python &>/dev/null; then
    NMEM='python -c "from neural_memory.cli import app; app()" --'
else
    echo "ERROR: nmem/python not found"
    exit 1
fi

echo "=== Neural Memory Maintenance ==="
echo "Brain: $BRAIN | Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

# Stats before
echo "--- Before ---"
eval $NMEM stats 2>/dev/null
echo ""

# Apply decay (conservative threshold)
echo "--- Applying Decay ---"
eval $NMEM decay --prune 0.01 2>/dev/null
echo ""

# Consolidate all strategies
echo "--- Consolidating ---"
eval $NMEM consolidate -s all 2>/dev/null
echo ""

# Sync brain DB to repo
echo "--- Syncing Brain DB ---"
cp ~/.neuralmemory/brains/${BRAIN}.db "${REPO_DIR}/brain-export.db"
echo "Copied ${BRAIN}.db -> brain-export.db"

# Stats after
echo ""
echo "--- After ---"
eval $NMEM stats 2>/dev/null
echo ""
echo "=== Maintenance Complete ==="
