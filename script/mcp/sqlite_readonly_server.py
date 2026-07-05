from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any
from urllib.parse import quote

from mcp.server.fastmcp import FastMCP


ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.environ.get("SQLITE_DB_PATH", "app/database/app.db"))
if not DB_PATH.is_absolute():
    DB_PATH = ROOT_DIR / DB_PATH

mcp = FastMCP("graphql-posts-sqlite-readonly")


def connect() -> sqlite3.Connection:
    uri = f"file:{quote(str(DB_PATH))}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def rows_to_json(rows: list[sqlite3.Row]) -> str:
    return json.dumps([dict(row) for row in rows], ensure_ascii=False, indent=2)


def ensure_readonly_sql(sql: str) -> str:
    statement = sql.strip()
    if not statement:
        raise ValueError("SQL is empty.")

    lowered = statement.lower()
    allowed_prefixes = ("select", "with", "explain")
    if not lowered.startswith(allowed_prefixes):
        raise ValueError("Only read-only SELECT, WITH, and EXPLAIN statements are allowed.")

    return statement


@mcp.tool()
def database_path() -> str:
    """Return the SQLite database path opened by this read-only MCP server."""
    return str(DB_PATH)


@mcp.tool()
def list_tables() -> str:
    """List user tables and views in the SQLite database."""
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT type, name, sql
            FROM sqlite_master
            WHERE type IN ('table', 'view')
              AND name NOT LIKE 'sqlite_%'
            ORDER BY type, name
            """
        ).fetchall()
    return rows_to_json(rows)


@mcp.tool()
def describe_table(table_name: str) -> str:
    """Show columns, indexes, and foreign keys for a table."""
    if not table_name.replace("_", "").replace("-", "").isalnum():
        raise ValueError("Invalid table name.")

    with connect() as connection:
        columns = [dict(row) for row in connection.execute(f"PRAGMA table_info({table_name})")]
        indexes = [dict(row) for row in connection.execute(f"PRAGMA index_list({table_name})")]
        foreign_keys = [dict(row) for row in connection.execute(f"PRAGMA foreign_key_list({table_name})")]

    return json.dumps(
        {
            "table": table_name,
            "columns": columns,
            "indexes": indexes,
            "foreignKeys": foreign_keys,
        },
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def query(sql: str, limit: int = 100) -> str:
    """Run a read-only SQL query. Only SELECT, WITH, and EXPLAIN are accepted."""
    statement = ensure_readonly_sql(sql)
    safe_limit = min(max(limit, 1), 500)

    with connect() as connection:
        rows = connection.execute(statement).fetchmany(safe_limit)

    return rows_to_json(rows)


def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"SQLite database does not exist: {DB_PATH}")
    mcp.run()


if __name__ == "__main__":
    main()
