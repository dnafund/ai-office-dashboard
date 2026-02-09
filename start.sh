#!/bin/bash
# Start AI Office Dashboard (Daemon + Frontend)
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🏢 Starting AI Office Dashboard..."
echo ""

# Start daemon
echo "🔧 Starting daemon on :3001..."
cd "$SCRIPT_DIR/daemon"
npx tsx src/index.ts &
DAEMON_PID=$!

# Start frontend
echo "🎮 Starting frontend on :5173..."
cd "$SCRIPT_DIR/frontend"
npx vite --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo "✅ AI Office running!"
echo "   Frontend: http://localhost:5173"
echo "   Daemon:   http://localhost:3001/api/teams"
echo "   WS:       ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both
trap "kill $DAEMON_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
