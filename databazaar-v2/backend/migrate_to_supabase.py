"""
Database Migration Script: SQLite (databazaar.db) -> Supabase / PostgreSQL

Usage:
  python migrate_to_supabase.py [OPTIONAL_SUPABASE_DATABASE_URL]

If not provided as an argument, it will read DATABASE_URL from .env or prompt for it.
"""

import os
import sys
import sqlite3
import psycopg2
import psycopg2.extras
from database import DB_PATH, init_postgres, PostgresConnectionWrapper

TABLES = [
    "users",
    "datasets",
    "scrape_jobs",
    "access_logs",
    "credit_transactions",
    "scrape_logs",
    "whatsapp_progress",
    "marketing_campaigns",
    "campaign_logs",
    "dataset_requests",
    "security_violations",
    "payment_requests",
    "banned_ips",
    "payment_settings",
    "brevo_applications"
]

TABLES_WITH_SERIAL_ID = [
    "users",
    "datasets",
    "scrape_jobs",
    "access_logs",
    "credit_transactions",
    "scrape_logs",
    "campaign_logs",
    "dataset_requests",
    "security_violations",
    "payment_requests",
    "brevo_applications"
]

def migrate():
    # 1. Determine Supabase Database URL
    target_url = ""
    if len(sys.argv) > 1:
        target_url = sys.argv[1].strip()
    
    if not target_url:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("DATABASE_URL="):
                        target_url = line.split("=", 1)[1].strip().strip("'").strip('"')

    if not target_url:
        target_url = os.getenv("DATABASE_URL", "").strip()

    if not target_url:
        print("\n[MIGRATION PROMPT] Please enter your Supabase Database Connection URI:")
        print("Example: postgresql://postgres.xxxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres")
        try:
            target_url = input("Database URI: ").strip()
        except EOFError:
            pass

    if not target_url:
        print("[ERROR] No DATABASE_URL provided. Migration aborted.")
        sys.exit(1)

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    print(f"\n[*] Connecting to Supabase PostgreSQL at {target_url[:30]}...")
    try:
        pg_conn = psycopg2.connect(target_url)
        pg_conn.autocommit = False
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    print("[*] Ensuring Supabase tables exist...")
    wrapped_pg = PostgresConnectionWrapper(pg_conn)
    init_postgres(wrapped_pg)
    
    # Re-open fresh connection after schema initialization
    pg_conn = psycopg2.connect(target_url)
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if not os.path.exists(DB_PATH):
        print(f"[WARN] Local SQLite database '{DB_PATH}' not found. Nothing to copy.")
        sys.exit(0)

    print(f"[*] Reading source SQLite database '{DB_PATH}'...")
    sq_conn = sqlite3.connect(DB_PATH)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    total_migrated = 0

    for table in TABLES:
        try:
            # Check if table exists in SQLite
            sq_cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not sq_cur.fetchone():
                continue

            sq_cur.execute(f"SELECT * FROM {table}")
            rows = sq_cur.fetchall()
            if not rows:
                print(f"  - {table}: 0 rows (empty, skipped)")
                continue

            columns = list(rows[0].keys())
            col_names = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))

            # Upsert into PostgreSQL
            insert_sql = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

            data = [tuple(row[c] for c in columns) for row in rows]
            pg_cur.executemany(insert_sql, data)
            pg_conn.commit()

            print(f"  [OK] {table}: {len(rows)} rows copied successfully")
            total_migrated += len(rows)

        except Exception as err:
            pg_conn.rollback()
            print(f"  [ERROR] Migrating table '{table}': {err}")

    # Reset sequences for serial IDs so subsequent inserts start with max(id) + 1
    print("\n[*] Synchronizing PostgreSQL serial ID sequences...")
    for table in TABLES_WITH_SERIAL_ID:
        try:
            pg_cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    coalesce((SELECT max(id) FROM "{table}"), 0) + 1,
                    false
                );
            """)
            pg_conn.commit()
        except Exception:
            pg_conn.rollback()

    sq_conn.close()
    pg_conn.close()

    print(f"\n🎉 Migration complete! {total_migrated} total records copied to Supabase.")

if __name__ == "__main__":
    migrate()
