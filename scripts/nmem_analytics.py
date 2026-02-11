"""
Neural Memory Analytics Report
Usage: python3 scripts/nmem_analytics.py
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


DB_PATH = Path.home() / ".neuralmemory" / "brains" / "ai-office-dashboard.db"
BRAIN_NAME = "ai-office-dashboard"


def get_brain_id(cursor: sqlite3.Cursor) -> str:
    cursor.execute("SELECT id FROM brains WHERE name = ?", (BRAIN_NAME,))
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"Brain '{BRAIN_NAME}' not found")
    return row[0]


def decay_health(cursor: sqlite3.Cursor, brain_id: str) -> dict[str, Any]:
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN activation_level = 0 THEN 1 ELSE 0 END) as dormant,
            SUM(CASE WHEN activation_level > 0 AND activation_level < 0.2 THEN 1 ELSE 0 END) as low,
            SUM(CASE WHEN activation_level >= 0.2 AND activation_level < 0.5 THEN 1 ELSE 0 END) as medium,
            SUM(CASE WHEN activation_level >= 0.5 THEN 1 ELSE 0 END) as high,
            AVG(activation_level) as avg_activation,
            MAX(activation_level) as max_activation,
            SUM(CASE WHEN access_frequency > 0 THEN 1 ELSE 0 END) as ever_accessed
        FROM neuron_states
        WHERE brain_id = ?
    """, (brain_id,))
    r = cursor.fetchone()
    return {
        "total": r[0], "dormant": r[1], "low": r[2], "medium": r[3], "high": r[4],
        "avg_activation": round(r[5] or 0, 4), "max_activation": round(r[6] or 0, 4),
        "ever_accessed": r[7],
    }


def most_recalled_neurons(
    cursor: sqlite3.Cursor, brain_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT n.content, n.type, ns.access_frequency, ns.activation_level
        FROM neuron_states ns
        JOIN neurons n ON ns.neuron_id = n.id AND ns.brain_id = n.brain_id
        WHERE ns.brain_id = ? AND ns.access_frequency > 0
        ORDER BY ns.access_frequency DESC
        LIMIT ?
    """, (brain_id, limit))
    return [
        {"content": r[0][:80], "type": r[1], "freq": r[2], "activation": round(r[3], 4)}
        for r in cursor.fetchall()
    ]


def strongest_synapses(
    cursor: sqlite3.Cursor, brain_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT src.content, tgt.content, s.weight, s.reinforced_count, s.type
        FROM synapses s
        JOIN neurons src ON s.source_id = src.id AND s.brain_id = src.brain_id
        JOIN neurons tgt ON s.target_id = tgt.id AND s.brain_id = tgt.brain_id
        WHERE s.brain_id = ?
        ORDER BY s.weight DESC
        LIMIT ?
    """, (brain_id, limit))
    return [
        {"source": r[0][:40], "target": r[1][:40], "weight": round(r[2], 3),
         "reinforced": r[3], "type": r[4]}
        for r in cursor.fetchall()
    ]


def most_active_fibers(
    cursor: sqlite3.Cursor, brain_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT f.summary, f.frequency, f.conductivity, f.salience,
               tm.memory_type, tm.priority
        FROM fibers f
        LEFT JOIN typed_memories tm ON f.id = tm.fiber_id AND f.brain_id = tm.brain_id
        WHERE f.brain_id = ?
        ORDER BY f.frequency DESC
        LIMIT ?
    """, (brain_id, limit))
    return [
        {"summary": (r[0] or "")[:60], "freq": r[1], "conductivity": round(r[2], 3),
         "type": r[4], "priority": r[5]}
        for r in cursor.fetchall()
    ]


def memory_type_distribution(
    cursor: sqlite3.Cursor, brain_id: str
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT memory_type, COUNT(*) as cnt, AVG(priority) as avg_pri
        FROM typed_memories
        WHERE brain_id = ?
        GROUP BY memory_type
        ORDER BY cnt DESC
    """, (brain_id,))
    return [{"type": r[0], "count": r[1], "avg_priority": round(r[2], 1)} for r in cursor.fetchall()]


def synapse_weight_distribution(
    cursor: sqlite3.Cursor, brain_id: str
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT
            CASE
                WHEN weight < 0.3 THEN 'weak (<0.3)'
                WHEN weight < 0.5 THEN 'moderate (0.3-0.5)'
                WHEN weight < 0.7 THEN 'standard (0.5-0.7)'
                WHEN weight < 0.9 THEN 'strong (0.7-0.9)'
                ELSE 'very strong (>=0.9)'
            END as bucket,
            COUNT(*) as cnt,
            ROUND(AVG(weight), 3) as avg_weight
        FROM synapses
        WHERE brain_id = ?
        GROUP BY bucket
        ORDER BY avg_weight
    """, (brain_id,))
    return [{"bucket": r[0], "count": r[1], "avg_weight": r[2]} for r in cursor.fetchall()]


def neuron_type_counts(
    cursor: sqlite3.Cursor, brain_id: str
) -> list[dict[str, Any]]:
    cursor.execute("""
        SELECT type, COUNT(*) as cnt
        FROM neurons
        WHERE brain_id = ?
        GROUP BY type
        ORDER BY cnt DESC
    """, (brain_id,))
    return [{"type": r[0], "count": r[1]} for r in cursor.fetchall()]


def generate_report() -> str:
    if not DB_PATH.exists():
        return f"Brain DB not found at {DB_PATH}"

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    brain_id = get_brain_id(cursor)

    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("  NEURAL MEMORY ANALYTICS REPORT")
    lines.append(f"  Brain: {BRAIN_NAME} | {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("=" * 60)

    health = decay_health(cursor, brain_id)
    lines.append("\n1. NEURON ACTIVATION HEALTH")
    lines.append(f"   Total: {health['total']}  |  Ever accessed: {health['ever_accessed']}")
    lines.append(f"   Dormant: {health['dormant']}  Low: {health['low']}  Med: {health['medium']}  High: {health['high']}")
    lines.append(f"   Avg activation: {health['avg_activation']}  Max: {health['max_activation']}")

    ntypes = neuron_type_counts(cursor, brain_id)
    lines.append("\n2. NEURON TYPE DISTRIBUTION")
    for n in ntypes:
        bar = "#" * min(n["count"] // 2, 30)
        lines.append(f"   {n['type']:12s} {n['count']:4d} {bar}")

    recalled = most_recalled_neurons(cursor, brain_id)
    lines.append("\n3. MOST RECALLED NEURONS")
    if recalled:
        for i, n in enumerate(recalled, 1):
            lines.append(f"   {i}. [{n['type']}] freq={n['freq']} act={n['activation']} | {n['content']}")
    else:
        lines.append("   (none recalled yet)")

    strong = strongest_synapses(cursor, brain_id)
    lines.append("\n4. STRONGEST SYNAPSES")
    for i, s in enumerate(strong, 1):
        lines.append(f"   {i}. {s['source']} -> {s['target']}")
        lines.append(f"      w={s['weight']} reinforced={s['reinforced']} type={s['type']}")

    fibers = most_active_fibers(cursor, brain_id)
    lines.append("\n5. MOST ACTIVE FIBERS (memories)")
    for i, f in enumerate(fibers, 1):
        lines.append(f"   {i}. [{f['type']}] p={f['priority']} freq={f['freq']} | {f['summary']}")

    dist = memory_type_distribution(cursor, brain_id)
    lines.append("\n6. TYPED MEMORY DISTRIBUTION")
    for d in dist:
        lines.append(f"   {d['type']:15s} count={d['count']:3d}  avg_priority={d['avg_priority']}")

    weights = synapse_weight_distribution(cursor, brain_id)
    lines.append("\n7. SYNAPSE WEIGHT DISTRIBUTION")
    for w in weights:
        bar = "#" * min(w["count"] // 5, 30)
        lines.append(f"   {w['bucket']:25s} {w['count']:4d} (avg {w['avg_weight']}) {bar}")

    lines.append("\n" + "=" * 60)
    conn.close()
    return "\n".join(lines)


if __name__ == "__main__":
    print(generate_report())
