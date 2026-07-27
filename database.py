"""
DataBazaar — Database Setup (SQLite)
"""
import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash
from config import DATABASE_PATH


def get_db():
    """Get a database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            credits INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            division TEXT,
            district TEXT,
            area TEXT,
            description TEXT,
            file_path TEXT NOT NULL,
            row_count INTEGER DEFAULT 0,
            column_names TEXT,
            price_credits INTEGER DEFAULT 10,
            is_active INTEGER DEFAULT 1,
            uploaded_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        );

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
        );

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
        );

        CREATE TABLE IF NOT EXISTS credit_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            transaction_type TEXT CHECK(transaction_type IN ('add', 'deduct')),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS scrape_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES scrape_jobs(id)
        );

        CREATE TABLE IF NOT EXISTS whatsapp_progress (
            recipient_group TEXT PRIMARY KEY,
            last_index INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    conn.close()


def create_admin_if_not_exists():
    """Create default admin user if none exists"""
    conn = get_db()
    admin = conn.execute("SELECT id FROM users WHERE role = 'admin'").fetchone()

    if not admin:
        conn.execute(
            "INSERT INTO users (email, password_hash, full_name, role, credits) VALUES (?, ?, ?, ?, ?)",
            (
                "admin@databazaar.com",
                generate_password_hash("admin123"),
                "Admin",
                "admin",
                999999,
            ),
        )
        conn.commit()
        print("[OK] Default admin created: admin@databazaar.com / admin123")

    conn.close()


def seed_demo_dataset(file_path, name="Coaching Centers Mirpur", category="Coaching Center"):
    """Seed a demo dataset from existing Excel file if not already in DB"""
    import pandas as pd

    conn = get_db()
    existing = conn.execute("SELECT id FROM datasets WHERE name = ?", (name,)).fetchone()

    if existing:
        conn.close()
        return

    if not os.path.exists(file_path):
        conn.close()
        return

    try:
        df = pd.read_excel(file_path)
        row_count = len(df)
        column_names = ",".join(df.columns.tolist())

        conn.execute(
            """INSERT INTO datasets (name, category, division, district, area, description,
               file_path, row_count, column_names, price_credits, uploaded_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                name,
                category,
                "Dhaka",
                "Dhaka City",
                "Mirpur",
                f"Coaching centers scraped from Google Maps in the Mirpur area, Dhaka. Contains {row_count} entries with names, phone numbers, addresses, and ratings.",
                file_path,
                row_count,
                column_names,
                10,
                1,  # admin user
            ),
        )
        conn.commit()
        print(f"[OK] Demo dataset seeded: {name} ({row_count} rows)")
    except Exception as e:
        print(f"[WARN] Could not seed demo dataset: {e}")

    conn.close()


if __name__ == "__main__":
    init_db()
    create_admin_if_not_exists()
    print("[OK] Database initialized successfully!")
