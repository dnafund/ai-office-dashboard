# Claude Code Brain

## Project
AI Office Dashboard — internal monitoring & management dashboard.

## Session Startup (MANDATORY)

Every new session, BEFORE doing any work, execute these in order:

1. `nmem_context` — Load recent memories
2. `nmem_recall("dashboard features components")` — Recall UI state
3. `nmem_recall("bugs fixes known issues")` — Recall bug patterns
4. `nmem_recall("recent sessions changes")` — Recall latest work

Only read source files when needed for actual coding tasks.

## Code Style
- Commit: `feat:` / `fix:` / `docs:` / `chore:` prefix
- No Spec = No Code: Write mini-spec for new features, wait for OK
- Update docs after code changes

## Memory
- **CLAUDE.md** (this file): Static brain — key rules, files, style
- **neural-memory**: Dynamic brain — MCP server auto-configured
  - Brain name: `ai-office-dashboard`
  - Use `nmem_recall` tool to query past decisions, bugs, context
  - Sync file: `brain-export.db` (SQLite, committed to Git)
  - **Session start** (new machine): `bash scripts/setup_hooks.sh`
  - **Before push to GitHub**: `bash scripts/nmem_maintenance.sh` (auto-syncs DB)
  - MUST sync DB before push to keep brain in sync across machines

### Memory Type Guidelines
When storing memories, use these types:
- **error**: Bug patterns, known pitfalls, things that broke
- **instruction**: Rules, directives, must-follow constraints
- **decision**: Architectural choices, config decisions with rationale
- **workflow**: Step-by-step processes, SOPs
- **insight**: Patterns observed, performance correlations
- **fact**: Project state, version info
- **todo**: Pending work items (auto-expires 30 days)

### Brain Analytics
Run `python3 scripts/nmem_analytics.py` for deep analytics report.
Quick: `nmem stats`, `nmem dashboard`, `nmem graph "topic"`.

## User
- Vietnamese speaker (messages often in Vietnamese)
- Orchestrator role — directs workflow, does NOT code
- Prefers concise answers, not verbose explanations
