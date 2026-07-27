import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "databazaar.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
            credits INTEGER DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Datasets table
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

    # Scrape jobs table
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

    # Access logs
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

    # Credit transactions
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

    # Scraper logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES scrape_jobs(id)
        )
    """)

    # WhatsApp progress tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS whatsapp_progress (
            recipient_group TEXT PRIMARY KEY,
            last_index INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Marketing campaigns table
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

    # Marketing campaign logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaign_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id)
        )
    """)

    # Security Violations
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

    # Banned IPs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS banned_ips (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migration: Add new columns to existing tables if missing
    try:
        cursor.execute("ALTER TABLE marketing_campaigns ADD COLUMN failed_count INTEGER DEFAULT 0")
    except Exception:
        pass  # Column already exists
    try:
        cursor.execute("ALTER TABLE marketing_campaigns ADD COLUMN start_row INTEGER DEFAULT 0")
    except Exception:
        pass  # Column already exists
        
    # User ban tracking migrations
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN warning_message TEXT")
    except Exception:
        pass

    conn.commit()
    conn.close()
    print("[OK] Database schema initialized successfully.")

if __name__ == "__main__":
    init_db()
