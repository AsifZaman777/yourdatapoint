import os
import re
import sqlite3

try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "databazaar.db")

# Auto-load .env file if present
_env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_file):
    with open(_env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))

def get_database_url():
    """Retrieve DATABASE_URL from environment variable."""
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        # Normalize postgres:// to postgresql:// if needed
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    return ""

def is_postgres():
    """Returns True if PostgreSQL is configured via DATABASE_URL."""
    return bool(get_database_url()) and PSYCOPG2_AVAILABLE

TABLES_WITH_ID = {
    "users", "datasets", "scrape_jobs", "access_logs", "credit_transactions",
    "scrape_logs", "campaign_logs", "dataset_requests", "security_violations",
    "payment_requests", "brevo_applications"
}

class PostgresCursorWrapper:
    """
    Transparent cursor wrapper that converts SQLite query conventions ('?' placeholders,
    'INSERT OR REPLACE', and 'lastrowid') into PostgreSQL equivalents.
    """
    def __init__(self, raw_cursor, conn_wrapper):
        self.cursor = raw_cursor
        self.conn_wrapper = conn_wrapper
        self.lastrowid = None

    def _convert_query(self, query: str) -> tuple[str, bool]:
        q = query.strip()
        q_upper = q.upper()
        appended_returning_id = False

        # 1. Handle INSERT OR REPLACE INTO for progress & payment settings
        if "INSERT OR REPLACE INTO" in q_upper:
            if "WHATSAPP_PROGRESS" in q_upper:
                q = re.sub(
                    r"INSERT\s+OR\s+REPLACE\s+INTO\s+whatsapp_progress\s*\((.*?)\)\s*VALUES\s*\((.*?)\)",
                    r"INSERT INTO whatsapp_progress (\1) VALUES (\2) ON CONFLICT (recipient_group) DO UPDATE SET last_index = EXCLUDED.last_index, updated_at = CURRENT_TIMESTAMP",
                    q, flags=re.IGNORECASE
                )
            elif "PAYMENT_SETTINGS" in q_upper:
                q = re.sub(
                    r"INSERT\s+OR\s+REPLACE\s+INTO\s+payment_settings\s*\((.*?)\)\s*VALUES\s*\((.*?)\)",
                    r"INSERT INTO payment_settings (\1) VALUES (\2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
                    q, flags=re.IGNORECASE
                )

        # 2. Append RETURNING id for INSERT queries on tables with an autoincrement ID
        if q.strip().upper().startswith("INSERT INTO") and "RETURNING" not in q.upper():
            m = re.match(r"INSERT\s+INTO\s+([a-zA-Z0-9_]+)", q, re.IGNORECASE)
            if m:
                tbl = m.group(1).lower()
                if tbl in TABLES_WITH_ID:
                    q = f"{q} RETURNING id"
                    appended_returning_id = True

        # 3. Convert '?' placeholder outside of quotes to '%s'
        in_quote = False
        quote_char = None
        converted = []
        for ch in q:
            if ch in ("'", '"'):
                if not in_quote:
                    in_quote = True
                    quote_char = ch
                elif quote_char == ch:
                    in_quote = False
                    quote_char = None
                converted.append(ch)
            elif ch == "?" and not in_quote:
                converted.append("%s")
            else:
                converted.append(ch)

        return "".join(converted), appended_returning_id

    def execute(self, query, params=None):
        sql, appended_returning = self._convert_query(query)
        self.lastrowid = None

        if params is not None:
            if isinstance(params, list):
                params = tuple(params)
            self.cursor.execute(sql, params)
        else:
            self.cursor.execute(sql)

        if appended_returning:
            try:
                row = self.cursor.fetchone()
                if row:
                    self.lastrowid = row["id"] if isinstance(row, dict) or hasattr(row, "__getitem__") else row[0]
            except Exception:
                pass
        return self

    def executemany(self, query, seq_of_parameters):
        sql, _ = self._convert_query(query)
        self.cursor.executemany(sql, seq_of_parameters)
        return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def fetchmany(self, size=None):
        return self.cursor.fetchmany(size) if size else self.cursor.fetchmany()

    @property
    def rowcount(self):
        return self.cursor.rowcount

    @property
    def description(self):
        return self.cursor.description

    def close(self):
        self.cursor.close()

    def __iter__(self):
        return iter(self.cursor)


class PostgresConnectionWrapper:
    """
    Wrapper around a psycopg2 connection providing sqlite3-compatible interface:
    - conn.execute(...) shortcut
    - conn.cursor() returning PostgresCursorWrapper with DictCursor
    - dict(row) and row['col'] access
    """
    def __init__(self, raw_conn):
        self.conn = raw_conn

    def cursor(self):
        raw_cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return PostgresCursorWrapper(raw_cur, self)

    def execute(self, query, params=None):
        cur = self.cursor()
        return cur.execute(query, params)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
        self.close()


def get_db():
    """
    Returns an active database connection.
    Uses PostgreSQL if DATABASE_URL is set; otherwise falls back to local SQLite.
    """
    db_url = get_database_url()
    if db_url and PSYCOPG2_AVAILABLE:
        try:
            # Connect to PostgreSQL / Supabase
            conn = psycopg2.connect(db_url)
            return PostgresConnectionWrapper(conn)
        except Exception as e:
            print(f"[POSTGRES CONNECT ERROR] Could not connect to {db_url[:20]}...: {e}")
            print("[FALLBACK] Falling back to local SQLite databazaar.db")

    # Local SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_postgres(conn):
    """Create all schema tables and run migrations on PostgreSQL / Supabase."""
    cur = conn.cursor()

    # Users
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin')),
            credits INTEGER DEFAULT 5,
            is_banned INTEGER DEFAULT 0,
            warning_message TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            brevo_api_key TEXT,
            brevo_account_status TEXT DEFAULT 'none',
            daily_email_limit INTEGER DEFAULT 300,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Datasets
    cur.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            file_path TEXT NOT NULL,
            row_count INTEGER DEFAULT 0,
            column_names TEXT,
            price_credits INTEGER DEFAULT 10,
            is_active INTEGER DEFAULT 1,
            uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Scrape jobs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scrape_jobs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'done', 'failed')),
            result_path TEXT,
            result_count INTEGER DEFAULT 0,
            cost_credits INTEGER DEFAULT 20,
            error_message TEXT,
            promotion_status TEXT DEFAULT 'none',
            proposed_name TEXT,
            proposed_category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        );
    """)

    # Access logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS access_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
            scrape_job_id INTEGER REFERENCES scrape_jobs(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            ip_address TEXT,
            accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Credit transactions
    cur.execute("""
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            transaction_type TEXT CHECK(transaction_type IN ('add', 'deduct')),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Scraper logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scrape_logs (
            id SERIAL PRIMARY KEY,
            job_id INTEGER NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # WhatsApp progress tracking
    cur.execute("""
        CREATE TABLE IF NOT EXISTS whatsapp_progress (
            recipient_group TEXT PRIMARY KEY,
            last_index INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Marketing campaigns
    cur.execute("""
        CREATE TABLE IF NOT EXISTS marketing_campaigns (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            campaign_type TEXT NOT NULL CHECK(campaign_type IN ('email', 'whatsapp')),
            recipient_group TEXT NOT NULL,
            template_preview TEXT,
            status TEXT DEFAULT 'running' CHECK(status IN ('running', 'done', 'failed', 'stopping', 'stopped')),
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            total_count INTEGER NOT NULL,
            start_row INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Campaign logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS campaign_logs (
            id SERIAL PRIMARY KEY,
            campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Dataset requests
    cur.execute("""
        CREATE TABLE IF NOT EXISTS dataset_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_email TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            business_name TEXT,
            category_query TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            additional_notes TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'fulfilled', 'rejected')),
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Security violations
    cur.execute("""
        CREATE TABLE IF NOT EXISTS security_violations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ip_address TEXT,
            user_agent TEXT,
            violation_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Payment requests
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payment_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_name TEXT,
            package_name TEXT NOT NULL,
            credits_requested INTEGER NOT NULL,
            amount_bdt REAL NOT NULL,
            payment_method TEXT DEFAULT 'bkash',
            bkash_number TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        );
    """)

    # Banned IPs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS banned_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Payment settings
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payment_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        );
    """)

    # Brevo applications
    cur.execute("""
        CREATE TABLE IF NOT EXISTS brevo_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            business_name TEXT NOT NULL,
            domain_name TEXT NOT NULL,
            location TEXT NOT NULL,
            business_phone TEXT NOT NULL,
            social_media_website TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            rejection_reason TEXT,
            assigned_api_key TEXT,
            daily_limit INTEGER DEFAULT 300,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        );
    """)

    # Columns safety check / migrations for PostgreSQL
    columns_to_add = [
        ("marketing_campaigns", "failed_count", "INTEGER DEFAULT 0"),
        ("marketing_campaigns", "start_row", "INTEGER DEFAULT 0"),
        ("users", "is_banned", "INTEGER DEFAULT 0"),
        ("users", "warning_message", "TEXT"),
        ("users", "is_verified", "INTEGER DEFAULT 0"),
        ("users", "verification_token", "TEXT"),
        ("users", "brevo_api_key", "TEXT"),
        ("users", "brevo_account_status", "TEXT DEFAULT 'none'"),
        ("users", "daily_email_limit", "INTEGER DEFAULT 300"),
        ("scrape_jobs", "promotion_status", "TEXT DEFAULT 'none'"),
        ("scrape_jobs", "proposed_name", "TEXT"),
        ("scrape_jobs", "proposed_category", "TEXT"),
        ("payment_requests", "payment_method", "TEXT DEFAULT 'bkash'"),
        ("payment_requests", "user_name", "TEXT"),
    ]
    for table, col, col_type in columns_to_add:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};")
        except Exception:
            pass

    conn.commit()
    conn.close()
    print("[OK] PostgreSQL / Supabase schema initialized.")


def init_sqlite(conn):
    """Create all schema tables and run migrations on SQLite."""
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin')),
            credits INTEGER DEFAULT 5,
            is_banned INTEGER DEFAULT 0,
            warning_message TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            brevo_api_key TEXT,
            brevo_account_status TEXT DEFAULT 'none',
            daily_email_limit INTEGER DEFAULT 300,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            file_path TEXT NOT NULL,
            row_count INTEGER DEFAULT 0,
            column_names TEXT,
            price_credits INTEGER DEFAULT 10,
            is_active INTEGER DEFAULT 1,
            uploaded_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            query TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'done', 'failed')),
            result_path TEXT,
            result_count INTEGER DEFAULT 0,
            cost_credits INTEGER DEFAULT 20,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dataset_id INTEGER,
            scrape_job_id INTEGER,
            action TEXT NOT NULL,
            ip_address TEXT,
            accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (dataset_id) REFERENCES datasets(id),
            FOREIGN KEY (scrape_job_id) REFERENCES scrape_jobs(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            transaction_type TEXT CHECK(transaction_type IN ('add', 'deduct')),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES scrape_jobs(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS whatsapp_progress (
            recipient_group TEXT PRIMARY KEY,
            last_index INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marketing_campaigns (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            campaign_type TEXT NOT NULL CHECK(campaign_type IN ('email', 'whatsapp')),
            recipient_group TEXT NOT NULL,
            template_preview TEXT,
            status TEXT DEFAULT 'running' CHECK(status IN ('running', 'done', 'failed', 'stopping', 'stopped')),
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            total_count INTEGER NOT NULL,
            start_row INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaign_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dataset_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_email TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            business_name TEXT,
            category_query TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            additional_notes TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'fulfilled', 'rejected')),
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            violation_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            package_name TEXT NOT NULL,
            credits_requested INTEGER NOT NULL,
            amount_bdt REAL NOT NULL,
            bkash_number TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            processed_by INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (processed_by) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS banned_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS brevo_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            business_name TEXT NOT NULL,
            domain_name TEXT NOT NULL,
            location TEXT NOT NULL,
            business_phone TEXT NOT NULL,
            social_media_website TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            rejection_reason TEXT,
            assigned_api_key TEXT,
            daily_limit INTEGER DEFAULT 300,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            processed_by INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (processed_by) REFERENCES users(id)
        )
    """)

    # Columns migrations for SQLite
    sqlite_migrations = [
        ("marketing_campaigns", "failed_count INTEGER DEFAULT 0"),
        ("marketing_campaigns", "start_row INTEGER DEFAULT 0"),
        ("users", "is_banned INTEGER DEFAULT 0"),
        ("users", "warning_message TEXT"),
        ("users", "is_verified INTEGER DEFAULT 0"),
        ("users", "verification_token TEXT"),
        ("scrape_jobs", "promotion_status TEXT DEFAULT 'none'"),
        ("scrape_jobs", "proposed_name TEXT"),
        ("scrape_jobs", "proposed_category TEXT"),
        ("payment_requests", "payment_method TEXT DEFAULT 'bkash'"),
        ("payment_requests", "user_name TEXT"),
        ("users", "brevo_api_key TEXT"),
        ("users", "brevo_account_status TEXT DEFAULT 'none'"),
        ("users", "daily_email_limit INTEGER DEFAULT 300"),
    ]
    for table, col_def in sqlite_migrations:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
        except Exception:
            pass

    conn.commit()
    conn.close()
    print("[OK] SQLite database schema initialized.")


def init_db():
    """Initializes database schema according to active driver (PostgreSQL or SQLite)."""
    conn = get_db()
    if is_postgres() and isinstance(conn, PostgresConnectionWrapper):
        init_postgres(conn)
    else:
        init_sqlite(conn)


def reset_db_only_superadmin():
    """Wipes non-superadmin data and re-creates superadmin user from configuration."""
    conn = get_db()

    tables = [
        "security_violations", "banned_ips", "access_logs",
        "credit_transactions", "scrape_logs", "scrape_jobs",
        "campaign_logs", "marketing_campaigns", "whatsapp_progress"
    ]
    for table in tables:
        try:
            conn.execute(f"DELETE FROM {table}")
        except Exception:
            pass

    from auth import hash_password
    from config import SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME

    pwd_hash = hash_password(SUPERADMIN_PASSWORD)

    # Re-insert or update superadmin
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (SUPERADMIN_EMAIL,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE users SET password_hash = ?, full_name = ?, role = 'superadmin', credits = 99999, is_verified = 1, is_banned = 0 WHERE email = ?",
            (pwd_hash, SUPERADMIN_NAME, SUPERADMIN_EMAIL)
        )
    else:
        conn.execute(
            """INSERT INTO users (email, full_name, password_hash, role, credits, is_verified, is_banned)
               VALUES (?, ?, ?, 'superadmin', 99999, 1, 0)""",
            (SUPERADMIN_EMAIL, SUPERADMIN_NAME, pwd_hash)
        )

    conn.commit()
    conn.close()
    print(f"[OK] DATABASE RESET COMPLETED! Only Superadmin ({SUPERADMIN_EMAIL}) registered.")


if __name__ == "__main__":
    init_db()
    reset_db_only_superadmin()
