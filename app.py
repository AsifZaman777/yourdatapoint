"""
DataBazaar — Main Flask Application
Data Marketplace & Scraping Service Platform
"""
import os
import json
import threading
import pandas as pd
from datetime import datetime
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, jsonify, flash, abort, g
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from config import (
    SECRET_KEY, DATABASE_PATH, UPLOAD_FOLDER, SCRAPE_RESULTS_FOLDER,
    ALLOWED_EXTENSIONS, CATEGORIES, REGIONS, ROWS_PER_PAGE, PREVIEW_ROWS,
    allowed_file, BASE_DIR
)
from database import get_db, init_db, create_admin_if_not_exists, seed_demo_dataset


app = Flask(__name__)
app.secret_key = SECRET_KEY
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SCRAPE_RESULTS_FOLDER, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please login to continue.", "warning")
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please login to continue.", "warning")
            return redirect(url_for("login_page"))
        if session.get("role") != "admin":
            abort(403)
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    if "user_id" not in session:
        return None
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    db.close()
    return user


def log_access(user_id, dataset_id=None, scrape_job_id=None, action="view"):
    db = get_db()
    db.execute(
        "INSERT INTO access_logs (user_id, dataset_id, scrape_job_id, action, ip_address) VALUES (?, ?, ?, ?, ?)",
        (user_id, dataset_id, scrape_job_id, action, request.remote_addr)
    )
    db.commit()
    db.close()


def mask_phone(phone):
    """Partially mask phone numbers for non-premium view"""
    if not phone or len(str(phone)) < 8:
        return phone
    phone = str(phone)
    if len(phone) >= 11:
        return phone[:5] + "XXX" + phone[-3:]
    return phone[:3] + "XXX" + phone[-2:]


def read_dataset_file(file_path):
    """Read a dataset file (Excel or CSV) into a pandas DataFrame"""
    if not os.path.exists(file_path):
        return None

    ext = file_path.rsplit(".", 1)[-1].lower()
    try:
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(file_path)
        elif ext == "csv":
            df = pd.read_csv(file_path)
        else:
            return None
        return df
    except Exception:
        return None


# ── Template Context ─────────────────────────────────────

@app.context_processor
def inject_globals():
    return {
        "current_user": get_current_user(),
        "categories": CATEGORIES,
        "regions": REGIONS,
    }


# ═══════════════════════════════════════════════════════════
#  PUBLIC PAGES
# ═══════════════════════════════════════════════════════════

@app.route("/")
def index():
    db = get_db()
    dataset_count = db.execute("SELECT COUNT(*) as c FROM datasets WHERE is_active = 1").fetchone()["c"]
    user_count = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    db.close()
    return render_template("index.html", dataset_count=dataset_count, user_count=user_count)


@app.route("/catalog")
def catalog():
    db = get_db()
    category = request.args.get("category", "")
    division = request.args.get("division", "")
    district = request.args.get("district", "")
    search = request.args.get("search", "")

    query = "SELECT * FROM datasets WHERE is_active = 1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)
    if division:
        query += " AND division = ?"
        params.append(division)
    if district:
        query += " AND district = ?"
        params.append(district)
    if search:
        query += " AND (name LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY created_at DESC"
    datasets = db.execute(query, params).fetchall()
    db.close()

    return render_template("catalog.html", datasets=datasets,
                         selected_category=category, selected_division=division,
                         selected_district=district, search_query=search)


@app.route("/dataset/<int:dataset_id>")
def view_dataset(dataset_id):
    db = get_db()
    dataset = db.execute("SELECT * FROM datasets WHERE id = ? AND is_active = 1", (dataset_id,)).fetchone()
    db.close()

    if not dataset:
        abort(404)

    return render_template("viewer.html", dataset=dataset)


@app.route("/scraper")
@login_required
def scraper_page():
    return render_template("scraper.html")


# ═══════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════

@app.route("/login", methods=["GET"])
def login_page():
    if "user_id" in session:
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/register", methods=["GET"])
def register_page():
    if "user_id" in session:
        return redirect(url_for("index"))
    return render_template("register.html")


@app.route("/auth/login", methods=["POST"])
def auth_login():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)).fetchone()
    db.close()

    if user and check_password_hash(user["password_hash"], password):
        session["user_id"] = user["id"]
        session["email"] = user["email"]
        session["full_name"] = user["full_name"]
        session["role"] = user["role"]
        session["credits"] = user["credits"]
        flash(f"Welcome back, {user['full_name']}!", "success")

        if user["role"] == "admin":
            return redirect(url_for("admin_dashboard"))
        return redirect(url_for("catalog"))

    flash("Invalid email or password.", "error")
    return redirect(url_for("login_page"))


@app.route("/auth/register", methods=["POST"])
def auth_register():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    full_name = request.form.get("full_name", "").strip()

    if not email or not password or not full_name:
        flash("All fields are required.", "error")
        return redirect(url_for("register_page"))

    if len(password) < 6:
        flash("Password must be at least 6 characters.", "error")
        return redirect(url_for("register_page"))

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()

    if existing:
        db.close()
        flash("An account with this email already exists.", "error")
        return redirect(url_for("register_page"))

    db.execute(
        "INSERT INTO users (email, password_hash, full_name, credits) VALUES (?, ?, ?, ?)",
        (email, generate_password_hash(password), full_name, 5)  # 5 free credits to start
    )
    db.commit()

    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    db.close()

    session["user_id"] = user["id"]
    session["email"] = user["email"]
    session["full_name"] = user["full_name"]
    session["role"] = user["role"]
    session["credits"] = user["credits"]

    flash(f"Welcome to DataBazaar, {full_name}! You've received 5 free credits.", "success")
    return redirect(url_for("catalog"))


@app.route("/auth/logout")
def auth_logout():
    session.clear()
    flash("You've been logged out.", "info")
    return redirect(url_for("index"))


# ═══════════════════════════════════════════════════════════
#  DATASET API (Protected, Non-downloadable)
# ═══════════════════════════════════════════════════════════

@app.route("/api/dataset/<int:dataset_id>/preview")
def api_dataset_preview(dataset_id):
    """Free preview — returns first few rows with masked phone numbers"""
    db = get_db()
    dataset = db.execute("SELECT * FROM datasets WHERE id = ? AND is_active = 1", (dataset_id,)).fetchone()
    db.close()

    if not dataset:
        return jsonify({"error": "Dataset not found"}), 404

    df = read_dataset_file(dataset["file_path"])
    if df is None:
        return jsonify({"error": "Could not read dataset file"}), 500

    preview = df.head(PREVIEW_ROWS)
    columns = preview.columns.tolist()

    # Mask phone-like columns
    rows = []
    for _, row in preview.iterrows():
        r = {}
        for col in columns:
            val = str(row[col]) if pd.notna(row[col]) else ""
            if "phone" in col.lower() or "mobile" in col.lower() or "contact" in col.lower():
                val = mask_phone(val)
            r[col] = val
        rows.append(r)

    return jsonify({
        "dataset": {
            "id": dataset["id"],
            "name": dataset["name"],
            "category": dataset["category"],
            "row_count": dataset["row_count"],
            "description": dataset["description"],
        },
        "columns": columns,
        "rows": rows,
        "is_preview": True,
        "total_rows": dataset["row_count"],
    })


@app.route("/api/dataset/<int:dataset_id>/view")
@login_required
def api_dataset_view(dataset_id):
    """Full view — paginated, requires login, masks phone for non-premium"""
    page = request.args.get("page", 1, type=int)
    search = request.args.get("search", "").strip()
    sort_col = request.args.get("sort", "")
    sort_dir = request.args.get("dir", "asc")

    db = get_db()
    dataset = db.execute("SELECT * FROM datasets WHERE id = ? AND is_active = 1", (dataset_id,)).fetchone()

    if not dataset:
        db.close()
        return jsonify({"error": "Dataset not found"}), 404

    user = db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()

    # Check credits (admin bypasses)
    is_admin = session.get("role") == "admin"
    has_access = is_admin or user["credits"] > 0

    if not has_access:
        db.close()
        return jsonify({"error": "Insufficient credits. Please purchase credits to view this dataset.", "need_credits": True}), 403

    # Log access
    log_access(session["user_id"], dataset_id=dataset_id, action="view")

    # Deduct credit on first page view (not on pagination)
    if page == 1 and not is_admin:
        db.execute("UPDATE users SET credits = credits - 1 WHERE id = ?", (session["user_id"],))
        db.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)",
            (session["user_id"], 1, "deduct", f"Viewed dataset: {dataset['name']}")
        )
        db.commit()
        session["credits"] = user["credits"] - 1

    db.close()

    df = read_dataset_file(dataset["file_path"])
    if df is None:
        return jsonify({"error": "Could not read dataset file"}), 500

    # Search filter
    if search:
        mask = df.apply(lambda row: row.astype(str).str.contains(search, case=False).any(), axis=1)
        df = df[mask]

    # Sort
    if sort_col and sort_col in df.columns:
        ascending = sort_dir != "desc"
        df = df.sort_values(by=sort_col, ascending=ascending, na_position="last")

    total_rows = len(df)
    total_pages = max(1, (total_rows + ROWS_PER_PAGE - 1) // ROWS_PER_PAGE)
    page = max(1, min(page, total_pages))

    start = (page - 1) * ROWS_PER_PAGE
    end = start + ROWS_PER_PAGE
    page_df = df.iloc[start:end]

    columns = page_df.columns.tolist()

    # Build rows — mask phone columns
    rows = []
    for _, row in page_df.iterrows():
        r = {}
        for col in columns:
            val = str(row[col]) if pd.notna(row[col]) else ""
            if not is_admin and ("phone" in col.lower() or "mobile" in col.lower()):
                val = mask_phone(val)
            r[col] = val
        rows.append(r)

    return jsonify({
        "columns": columns,
        "rows": rows,
        "page": page,
        "total_pages": total_pages,
        "total_rows": total_rows,
        "is_preview": False,
        "user_email": session.get("email", ""),
    })


# ═══════════════════════════════════════════════════════════
#  CUSTOM SCRAPER API
# ═══════════════════════════════════════════════════════════

@app.route("/api/scrape", methods=["POST"])
@login_required
def api_submit_scrape():
    """Submit a custom scrape job"""
    data = request.get_json() or request.form
    query = data.get("query", "").strip()
    division = data.get("division", "").strip()
    district = data.get("district", "").strip()
    area = data.get("area", "").strip()

    if not query:
        return jsonify({"error": "Search query is required"}), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()

    cost = 20  # credits per scrape
    if user["credits"] < cost and session.get("role") != "admin":
        db.close()
        return jsonify({"error": f"Insufficient credits. This scrape costs {cost} credits.", "need_credits": True}), 403

    # Create scrape job
    cursor = db.execute(
        """INSERT INTO scrape_jobs (user_id, query, division, district, area, cost_credits)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (session["user_id"], query, division, district, area, cost)
    )
    job_id = cursor.lastrowid

    # Deduct credits
    if session.get("role") != "admin":
        db.execute("UPDATE users SET credits = credits - ? WHERE id = ?", (cost, session["user_id"]))
        db.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)",
            (session["user_id"], cost, "deduct", f"Custom scrape job #{job_id}: {query}")
        )
        session["credits"] = user["credits"] - cost

    db.commit()
    db.close()

    # Start scrape in background thread
    thread = threading.Thread(target=run_scrape_job, args=(job_id, query, division, district, area))
    thread.daemon = True
    thread.start()

    return jsonify({"job_id": job_id, "status": "pending", "message": "Scrape job submitted! Check status for progress."})


def run_scrape_job(job_id, query, division, district, area):
    """Run the scraper in background (uses the existing index.py scraper) and logs to DB"""
    from index import setup_driver, scrape_query, save_to_excel

    db = get_db()
    db.execute("UPDATE scrape_jobs SET status = 'running' WHERE id = ?", (job_id,))
    db.execute("INSERT INTO scrape_logs (job_id, message) VALUES (?, ?)", (job_id, "Scrape job initialized."))
    db.commit()

    def log_to_db(msg):
        # Create a new short-lived connection inside the thread/callback
        conn = get_db()
        conn.execute("INSERT INTO scrape_logs (job_id, message) VALUES (?, ?)", (job_id, msg))
        conn.commit()
        conn.close()
        print(f"[JOB #{job_id}] {msg}")

    try:
        # Build search query with region
        search_parts = [query]
        if area:
            search_parts.append(area)
        if district:
            search_parts.append(district)
        if division:
            search_parts.append(division)
        search_query = " ".join(search_parts)

        log_to_db(f"Launching scraper browser for search: '{search_query}'")
        driver = setup_driver()
        results = scrape_query(driver, search_query, log_cb=log_to_db)
        driver.quit()

        # Save results
        result_file = os.path.join(SCRAPE_RESULTS_FOLDER, f"scrape_{job_id}.xlsx")
        if results:
            log_to_db(f"Saving {len(results)} scraped entries to Excel...")
            save_to_excel(results, result_file)
            log_to_db("Excel file created successfully.")
        else:
            log_to_db("No results found.")

        db.execute(
            "UPDATE scrape_jobs SET status = 'done', result_path = ?, result_count = ?, completed_at = ? WHERE id = ?",
            (result_file, len(results), datetime.now().isoformat(), job_id)
        )
        db.execute("INSERT INTO scrape_logs (job_id, message) VALUES (?, ?)", (job_id, "Scrape job completed successfully."))
        db.commit()

    except Exception as e:
        error_msg = str(e)
        log_to_db(f"CRITICAL ERROR: {error_msg}")
        db.execute(
            "UPDATE scrape_jobs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?",
            (error_msg, datetime.now().isoformat(), job_id)
        )
        db.commit()

    db.close()


@app.route("/api/scrape/<int:job_id>/status")
@login_required
def api_scrape_status(job_id):
    db = get_db()
    job = db.execute(
        "SELECT * FROM scrape_jobs WHERE id = ? AND user_id = ?",
        (job_id, session["user_id"])
    ).fetchone()
    
    if not job:
        db.close()
        return jsonify({"error": "Job not found"}), 404

    # Fetch logs for this job
    logs = db.execute(
        "SELECT message, created_at FROM scrape_logs WHERE job_id = ? ORDER BY id ASC",
        (job_id,)
    ).fetchall()
    db.close()

    logs_list = [{"message": log["message"], "timestamp": log["created_at"]} for log in logs]

    return jsonify({
        "job_id": job["id"],
        "query": job["query"],
        "status": job["status"],
        "result_count": job["result_count"],
        "error_message": job["error_message"],
        "created_at": job["created_at"],
        "completed_at": job["completed_at"],
        "logs": logs_list
    })


@app.route("/api/scrape/<int:job_id>/result")
@login_required
def api_scrape_result(job_id):
    """View scrape results (non-downloadable, same as dataset viewer)"""
    page = request.args.get("page", 1, type=int)

    db = get_db()
    job = db.execute(
        "SELECT * FROM scrape_jobs WHERE id = ? AND user_id = ?",
        (job_id, session["user_id"])
    ).fetchone()
    db.close()

    if not job or job["status"] != "done":
        return jsonify({"error": "Results not available"}), 404

    df = read_dataset_file(job["result_path"])
    if df is None:
        return jsonify({"error": "Could not read results"}), 500

    total_rows = len(df)
    total_pages = max(1, (total_rows + ROWS_PER_PAGE - 1) // ROWS_PER_PAGE)
    page = max(1, min(page, total_pages))

    start = (page - 1) * ROWS_PER_PAGE
    end = start + ROWS_PER_PAGE
    page_df = df.iloc[start:end]

    columns = page_df.columns.tolist()
    rows = []
    for _, row in page_df.iterrows():
        r = {}
        for col in columns:
            val = str(row[col]) if pd.notna(row[col]) else ""
            r[col] = val
        rows.append(r)

    log_access(session["user_id"], scrape_job_id=job_id, action="view_scrape_result")

    return jsonify({
        "columns": columns,
        "rows": rows,
        "page": page,
        "total_pages": total_pages,
        "total_rows": total_rows,
        "user_email": session.get("email", ""),
    })


@app.route("/scrape/<int:job_id>/view")
@login_required
def view_scrape_result(job_id):
    """Render scrape result viewer page"""
    db = get_db()
    job = db.execute(
        "SELECT * FROM scrape_jobs WHERE id = ? AND user_id = ?",
        (job_id, session["user_id"])
    ).fetchone()
    db.close()

    if not job:
        abort(404)

    return render_template("scrape_viewer.html", job=job)


# ═══════════════════════════════════════════════════════════
#  MARKETING COMMUNICATIONS PORTAL
# ═══════════════════════════════════════════════════════════

import random

# Global threads dict to track active senders
active_campaigns = {}

@app.route("/marketing-portal")
@login_required
def marketing_portal():
    # Fetch user's scrape jobs & uploaded datasets to allow sending messages/emails to
    db = get_db()
    datasets = db.execute("SELECT * FROM datasets WHERE is_active = 1").fetchall()
    jobs = db.execute("SELECT * FROM scrape_jobs WHERE user_id = ? AND status = 'done'", (session["user_id"],)).fetchall()
    db.close()
    
    # Check whatsapp status
    is_wa_ready = os.path.exists(os.path.join(BASE_DIR, "whatsapp_session"))
    
    return render_template("marketing_portal.html", datasets=datasets, jobs=jobs, is_wa_ready=is_wa_ready)


@app.route("/api/marketing/send-email", methods=["POST"])
@login_required
def api_send_email():
    """Simulate or trigger sending emails to target recipients using custom HTML template"""
    data = request.get_json() or {}
    html_code = data.get("html_code", "")
    subject = data.get("subject", "Marketing Campaign")
    recipient_group = data.get("recipient_group", "") # e.g. "dataset_1" or "job_3"

    if not html_code or not recipient_group:
        return jsonify({"error": "HTML template and recipient group are required."}), 400

    # Retrieve emails
    emails = []
    file_path = None
    
    db = get_db()
    if recipient_group.startswith("dataset_"):
        ds_id = recipient_group.replace("dataset_", "")
        ds = db.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if ds:
            file_path = ds["file_path"]
    elif recipient_group.startswith("job_"):
        job_id = recipient_group.replace("job_", "")
        jb = db.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
        if jb:
            file_path = jb["result_path"]
    db.close()

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "Recipient group file not found."}), 404

    df = read_dataset_file(file_path)
    if df is None:
        return jsonify({"error": "Failed to read recipient data file."}), 500

    # Look for email column
    email_col = None
    for col in df.columns:
        if "email" in col.lower() or "mail" in col.lower():
            email_col = col
            break

    if not email_col:
        # Generate dummy emails based on business names if none found (since Maps API doesn't return emails directly)
        name_col = df.columns[0]
        emails = [f"{str(row[name_col]).lower().replace(' ', '')}@example.com" for _, row in df.iterrows() if pd.notna(row[name_col])]
    else:
        emails = [str(row[email_col]) for _, row in df.iterrows() if pd.notna(row[email_col]) and "@" in str(row[email_col])]

    # Deduct 1 credit for running the email campaign
    db = get_db()
    user = db.execute("SELECT credits FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    if user["credits"] < 1 and session.get("role") != "admin":
        db.close()
        return jsonify({"error": "Insufficient credits to start email campaign."}), 403

    if session.get("role") != "admin":
        db.execute("UPDATE users SET credits = credits - 1 WHERE id = ?", (session["user_id"],))
        db.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, 1, 'deduct', 'Email marketing campaign')"
        )
        db.commit()
        session["credits"] = user["credits"] - 1
    db.close()

    # Create marketing campaign database record
    campaign_id = f"email_camp_{int(time.time())}"
    db = get_db()
    db.execute(
        """INSERT INTO marketing_campaigns (id, user_id, campaign_type, recipient_group, template_preview, status, sent_count, total_count)
           VALUES (?, ?, 'email', ?, ?, 'done', ?, ?)""",
        (campaign_id, session["user_id"], recipient_group, subject, len(emails), len(emails))
    )
    db.execute(
        "INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)",
        (campaign_id, f"Email campaign dispatched successfully to {len(emails)} recipients.")
    )
    db.commit()
    db.close()

    # Simulate background delivery status
    return jsonify({
        "success": True, 
        "campaign_id": campaign_id,
        "recipient_count": len(emails), 
        "message": f"Successfully initialized email campaign. Simulating delivery to {len(emails)} addresses."
    })


@app.route("/api/marketing/whatsapp-status")
@login_required
def api_whatsapp_status():
    """Verify if session files exist for WhatsApp login"""
    profile_path = os.path.join(BASE_DIR, "whatsapp_session")
    session_active = os.path.exists(profile_path) and len(os.listdir(profile_path)) > 0
    return jsonify({"session_active": session_active})


@app.route("/api/marketing/whatsapp-setup-session")
@login_required
def api_whatsapp_setup_session():
    """Launches WhatsApp Web using driver in non-headless mode to let Admin scan QR code once"""
    if session.get("role") != "admin":
        return jsonify({"error": "Only administrators can setup the global WhatsApp browser session."}), 403

    def launch_browser_for_login():
        from message_sender import setup_driver
        driver = setup_driver()
        driver.get("https://web.whatsapp.com")
        # Keep open for 2 minutes to scan
        time.sleep(120)
        driver.quit()

    t = threading.Thread(target=launch_browser_for_login)
    t.daemon = True
    t.start()

    return jsonify({"success": True, "message": "Chrome launched. Check your computer taskbar/screen to scan the QR code."})


@app.route("/api/marketing/whatsapp-progress", methods=["GET", "POST"])
@login_required
def api_whatsapp_progress():
    """Get or save the last sent index pointer of a lead group to allow stopping and resuming campaigns"""
    recipient_group = request.args.get("recipient_group") or request.json.get("recipient_group") if request.is_json or request.args else None
    if not recipient_group:
        return jsonify({"error": "Recipient group is required."}), 400

    db = get_db()
    if request.method == "POST":
        last_index = request.json.get("last_index", 0)
        db.execute(
            "INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (recipient_group, last_index)
        )
        db.commit()
        db.close()
        return jsonify({"success": True, "last_index": last_index})
    
    # GET request
    row = db.execute("SELECT last_index FROM whatsapp_progress WHERE recipient_group = ?", (recipient_group,)).fetchone()
    db.close()
    
    last_index = row["last_index"] if row else 0
    return jsonify({"recipient_group": recipient_group, "last_index": last_index})


@app.route("/api/marketing/send-whatsapp", methods=["POST"])
@login_required
def api_send_whatsapp():
    """Run WhatsApp sending campaign with human-like typing and smart interval protections"""
    data = request.get_json() or {}
    message_template = data.get("message_template", "")
    recipient_group = data.get("recipient_group", "") # "dataset_X" or "job_Y"
    resume = data.get("resume", False)

    if not message_template or not recipient_group:
        return jsonify({"error": "Message template and recipient group are required."}), 400

    # Retrieve phone list
    file_path = None
    group_name = ""
    db = get_db()
    if recipient_group.startswith("dataset_"):
        ds_id = recipient_group.replace("dataset_", "")
        ds = db.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if ds:
            file_path = ds["file_path"]
            group_name = ds["name"]
    elif recipient_group.startswith("job_"):
        job_id = recipient_group.replace("job_", "")
        jb = db.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
        if jb:
            file_path = jb["result_path"]
            group_name = f"Scrape job: {jb['query']}"
    db.close()

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "Recipient group file not found."}), 404

    df = read_dataset_file(file_path)
    if df is None:
        return jsonify({"error": "Failed to read recipient file."}), 500

    # Check for name and phone columns
    phone_col = None
    name_col = None
    for col in df.columns:
        if "phone" in col.lower() or "mobile" in col.lower() or "contact" in col.lower():
            phone_col = col
        if "name" in col.lower() or "title" in col.lower():
            name_col = col

    if not phone_col:
        return jsonify({"error": "Selected recipient group does not contain a phone/mobile column."}), 400

    contacts = []
    for _, row in df.iterrows():
        p = str(row[phone_col]).strip() if pd.notna(row[phone_col]) else ""
        n = str(row[name_col]).strip() if name_col and pd.notna(row[name_col]) else "Customer"
        if len(p) > 7:
            contacts.append({"phone": p, "name": n})

    # Get starting index offset if resuming
    start_index = 0
    db = get_db()
    if resume:
        row = db.execute("SELECT last_index FROM whatsapp_progress WHERE recipient_group = ?", (recipient_group,)).fetchone()
        if row:
            start_index = row["last_index"]
    db.close()

    # Deduct 5 credits for WhatsApp campaign (only if starting fresh, or at least check if admin)
    db = get_db()
    user = db.execute("SELECT credits FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    if user["credits"] < 5 and session.get("role") != "admin":
        db.close()
        return jsonify({"error": "Insufficient credits to start WhatsApp campaign (costs 5 credits)."}), 403

    if session.get("role") != "admin" and not resume:
        db.execute("UPDATE users SET credits = credits - 5 WHERE id = ?", (session["user_id"],))
        db.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, 5, 'deduct', 'WhatsApp marketing campaign')"
        )
        db.commit()
        session["credits"] = user["credits"] - 5
    db.close()

    campaign_id = f"wa_camp_{int(time.time())}"
    
    # Save campaign to SQLite
    db = get_db()
    db.execute(
        """INSERT INTO marketing_campaigns (id, user_id, campaign_type, recipient_group, template_preview, status, sent_count, total_count)
           VALUES (?, ?, 'whatsapp', ?, ?, 'running', ?, ?)""",
        (campaign_id, session["user_id"], recipient_group, message_template[:200], start_index, len(contacts))
    )
    db.commit()
    db.close()

    # Run WhatsApp sender in background thread
    t = threading.Thread(target=run_whatsapp_campaign, args=(campaign_id, contacts, message_template, recipient_group, start_index))
    t.daemon = True
    t.start()

    return jsonify({
        "success": True,
        "campaign_id": campaign_id,
        "recipient_count": len(contacts),
        "start_index": start_index,
        "message": f"WhatsApp campaign '{group_name}' started successfully in background with anti-ban protections."
    })


def run_whatsapp_campaign(campaign_id, contacts, template_text, recipient_group, start_index=0):
    """Background WhatsApp sender with Human-Like Delay, typing, and 2-min breaks"""
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    import urllib.parse
    from message_sender import setup_driver, wait_for_whatsapp_login, format_phone

    active_campaigns[campaign_id] = {
        "status": "running",
        "total": len(contacts),
        "sent": start_index,
        "logs": [f"Campaign started. Starting index: {start_index}. Preparing Selenium browser session..."]
    }

    def log_status(msg):
        if campaign_id in active_campaigns:
            active_campaigns[campaign_id]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
        
        # Write to SQLite DB
        try:
            conn = get_db()
            conn.execute("INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)", (campaign_id, msg))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error logging to DB: {e}")

    # Log initial statement in DB
    log_status(f"Campaign started. Starting index: {start_index}. Preparing Selenium browser session...")

    try:
        driver = setup_driver()
        if not wait_for_whatsapp_login(driver):
            log_status("ERROR: WhatsApp Web login timed out or failed.")
            active_campaigns[campaign_id]["status"] = "failed"
            driver.quit()
            return
        
        log_status("Connected to WhatsApp Web! Commencing dispatch list...")

        # Slice contacts starting from start_index
        target_contacts = contacts[start_index:]
        
        for idx, contact in enumerate(target_contacts):
            current_index = start_index + idx
            
            # Check if campaign has been stopped/killed by the user
            if campaign_id in active_campaigns and active_campaigns[campaign_id].get("status") == "stopping":
                log_status(f"Campaign stopped by user action. Paused at lead index: {current_index}.")
                driver.quit()
                return

            phone = contact["phone"]
            name = contact["name"]
            formatted = format_phone(phone)
            personalized_msg = template_text.replace("{name}", name)
            
            # Anti-ban break protection: Every 8 messages, wait 2 minutes
            if idx > 0 and idx % 8 == 0:
                log_status("Taking a 2-minute cooling break to simulate human speed and protect account...")
                for _ in range(24): # 24 * 5 seconds = 120 seconds
                    if campaign_id in active_campaigns and active_campaigns[campaign_id].get("status") == "stopping":
                        log_status(f"Campaign stopped by user during cooling break. Paused at lead index: {current_index}.")
                        driver.quit()
                        return
                    time.sleep(5)
            
            log_status(f"Opening chat for {name} ({formatted})...")
            
            url = f"https://web.whatsapp.com/send?phone={formatted}"
            driver.get(url)
            
            start_time = time.time()
            chat_ready = False
            invalid_num = False

            while time.time() - start_time < 35:
                if campaign_id in active_campaigns and active_campaigns[campaign_id].get("status") == "stopping":
                    log_status(f"Campaign stopped by user. Paused at lead index: {current_index}.")
                    driver.quit()
                    return
                
                page_text = driver.page_source.lower()
                if "phone number shared via url is invalid" in page_text or "not on whatsapp" in page_text:
                    invalid_num = True
                    break
                try:
                    tb = driver.find_elements(By.XPATH, '//div[@contenteditable="true"] | //div[@role="textbox"]')
                    if tb and len(tb) > 0:
                        chat_ready = True
                        break
                except Exception:
                    pass
                time.sleep(1)

            if invalid_num:
                log_status(f"Skipped {name}: Number is not active on WhatsApp.")
                conn = get_db()
                conn.execute(
                    "INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    (recipient_group, current_index + 1)
                )
                conn.commit()
                conn.close()
                active_campaigns[campaign_id]["sent"] = current_index + 1
                continue

            if not chat_ready:
                log_status(f"Error loading chat for {name}. Skipping...")
                continue

            # Type human-like
            try:
                textbox = driver.find_elements(By.XPATH, '//div[@contenteditable="true"] | //div[@role="textbox"]')[-1]
                textbox.click()
                time.sleep(1)
                
                log_status(f"Typing message to {name}...")
                words = personalized_msg.split(' ')
                for word in words:
                    if campaign_id in active_campaigns and active_campaigns[campaign_id].get("status") == "stopping":
                        log_status(f"Campaign stopped by user during typing. Paused at lead index: {current_index}.")
                        driver.quit()
                        return
                    textbox.send_keys(word + ' ')
                    time.sleep(random.uniform(0.05, 0.2))
                
                time.sleep(random.uniform(1.0, 2.5))
                textbox.send_keys(Keys.ENTER)
                
                # Update progress pointer and sent_count in SQLite
                conn = get_db()
                conn.execute(
                    "INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    (recipient_group, current_index + 1)
                )
                conn.execute(
                    "UPDATE marketing_campaigns SET sent_count = ? WHERE id = ?",
                    (current_index + 1, campaign_id)
                )
                conn.commit()
                conn.close()

                active_campaigns[campaign_id]["sent"] = current_index + 1
                log_status(f"Message successfully sent to {name}!")

                # Delay between individual messages: 10 - 25 seconds
                delay = random.randint(10, 25)
                time.sleep(delay)

            except Exception as e:
                log_status(f"Exception while typing to {name}: {str(e)}")

        driver.quit()
        log_status("WhatsApp campaign completed successfully!")
        active_campaigns[campaign_id]["status"] = "done"
        
        # Mark campaign as done in SQLite
        conn = get_db()
        conn.execute("UPDATE marketing_campaigns SET status = 'done' WHERE id = ?", (campaign_id,))
        conn.commit()
        conn.close()

    except Exception as e:
        log_status(f"Fatal Campaign Exception: {str(e)}")
        active_campaigns[campaign_id]["status"] = "failed"
        
        # Mark campaign as failed in SQLite
        try:
            conn = get_db()
            conn.execute("UPDATE marketing_campaigns SET status = 'failed' WHERE id = ?", (campaign_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

        try:
            driver.quit()
        except Exception:
            pass


@app.route("/api/marketing/whatsapp-campaign/<campaign_id>")
@login_required
def api_whatsapp_campaign_status(campaign_id):
    db = get_db()
    campaign = db.execute("SELECT * FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
    if not campaign:
        db.close()
        # Fallback to in-memory if campaign not yet synced to DB
        if campaign_id in active_campaigns:
            return jsonify(active_campaigns[campaign_id])
        return jsonify({"error": "Campaign not found"}), 404
        
    logs = db.execute("SELECT message, created_at FROM campaign_logs WHERE campaign_id = ? ORDER BY id ASC", (campaign_id,)).fetchall()
    db.close()
    
    logs_list = [f"[{log['created_at'].split(' ')[1] if ' ' in log['created_at'] else log['created_at']}] {log['message']}" for log in logs]
    
    return jsonify({
        "status": campaign["status"],
        "total": campaign["total_count"],
        "sent": campaign["sent_count"],
        "logs": logs_list
    })


@app.route("/api/marketing/whatsapp-campaign/<campaign_id>/stop", methods=["POST"])
@login_required
def api_whatsapp_campaign_stop(campaign_id):
    if campaign_id in active_campaigns:
        active_campaigns[campaign_id]["status"] = "stopping"
    
    db = get_db()
    db.execute("UPDATE marketing_campaigns SET status = 'stopping' WHERE id = ?", (campaign_id,))
    db.execute("INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)", (campaign_id, "User requested manual campaign termination."))
    db.commit()
    db.close()
    return jsonify({"success": True, "message": "Stop command dispatched to campaign thread."})


@app.route("/api/marketing/campaigns")
@login_required
def api_marketing_campaigns_list():
    db = get_db()
    if session.get("role") == "admin":
        campaigns = db.execute(
            """SELECT c.*, u.email, u.full_name FROM marketing_campaigns c
               JOIN users u ON c.user_id = u.id
               ORDER BY c.created_at DESC"""
        ).fetchall()
    else:
        campaigns = db.execute(
            "SELECT * FROM marketing_campaigns WHERE user_id = ? ORDER BY created_at DESC",
            (session["user_id"],)
        ).fetchall()
    db.close()
    
    result = []
    for c in campaigns:
        item = {
            "id": c["id"],
            "campaign_type": c["campaign_type"],
            "recipient_group": c["recipient_group"],
            "status": c["status"],
            "sent_count": c["sent_count"],
            "total_count": c["total_count"],
            "created_at": c["created_at"]
        }
        if session.get("role") == "admin":
            item["email"] = c["email"]
            item["full_name"] = c["full_name"]
        result.append(item)
        
    return jsonify(result)


# ═══════════════════════════════════════════════════════════
#  MY JOBS (User's scrape history)
# ═══════════════════════════════════════════════════════════

@app.route("/my-jobs")
@login_required
def my_jobs():
    db = get_db()
    jobs = db.execute(
        "SELECT * FROM scrape_jobs WHERE user_id = ? ORDER BY created_at DESC",
        (session["user_id"],)
    ).fetchall()
    db.close()
    return render_template("my_jobs.html", jobs=jobs)


# ═══════════════════════════════════════════════════════════
#  ADMIN ROUTES
# ═══════════════════════════════════════════════════════════

@app.route("/admin")
@admin_required
def admin_dashboard():
    db = get_db()
    stats = {
        "datasets": db.execute("SELECT COUNT(*) as c FROM datasets WHERE is_active = 1").fetchone()["c"],
        "users": db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'user'").fetchone()["c"],
        "scrape_jobs": db.execute("SELECT COUNT(*) as c FROM scrape_jobs").fetchone()["c"],
        "pending_jobs": db.execute("SELECT COUNT(*) as c FROM scrape_jobs WHERE status = 'pending'").fetchone()["c"],
        "total_views": db.execute("SELECT COUNT(*) as c FROM access_logs").fetchone()["c"],
    }

    recent_users = db.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 10").fetchall()
    recent_jobs = db.execute(
        """SELECT sj.*, u.email, u.full_name FROM scrape_jobs sj
           JOIN users u ON sj.user_id = u.id
           ORDER BY sj.created_at DESC LIMIT 10"""
    ).fetchall()
    datasets = db.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    all_users = db.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    db.close()

    return render_template("admin/dashboard.html", stats=stats,
                         recent_users=recent_users, recent_jobs=recent_jobs,
                         datasets=datasets, all_users=all_users)


@app.route("/admin/dataset/promote/<int:job_id>", methods=["POST"])
@admin_required
def admin_promote_scrape_to_dataset(job_id):
    db = get_db()
    job = db.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    
    if not job or job["status"] != 'done' or not job["result_path"]:
        db.close()
        flash("Invalid job or results are not ready yet.", "error")
        return redirect(url_for("admin_dashboard"))

    # Copy the file to the uploads folder to keep it safe/organized
    import shutil
    old_path = job["result_path"]
    filename = os.path.basename(old_path)
    new_path = os.path.join(UPLOAD_FOLDER, f"promoted_{job_id}_{filename}")
    
    try:
        shutil.copy(old_path, new_path)
    except Exception as e:
        db.close()
        flash(f"Failed to copy data file: {str(e)}", "error")
        return redirect(url_for("admin_dashboard"))

    # Read column names
    df = read_dataset_file(new_path)
    cols = ",".join(df.columns.tolist()) if df is not None else ""

    # Insert into datasets catalog
    dataset_name = f"Scraped: {job['query']}"
    if job["area"] or job["district"] or job["division"]:
        dataset_name += f" ({', '.join(filter(None, [job['area'], job['district'], job['division']]))})"

    db.execute(
        """INSERT INTO datasets (name, category, division, district, area, description,
           file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            dataset_name,
            "Other",  # Default category, admin can edit in details
            job["division"],
            job["district"],
            job["area"],
            f"Dataset promoted from background scrape job #{job_id}. Query: '{job['query']}'.",
            new_path,
            job["result_count"],
            cols,
            10, # default credit price
            session["user_id"]
        )
    )
    db.commit()
    db.close()

    flash(f"Scraped dataset successfully added to catalog as '{dataset_name}'!", "success")
    return redirect(url_for("catalog"))


@app.route("/admin/upload", methods=["GET"])
@admin_required
def admin_upload_page():
    return render_template("admin/upload.html")


@app.route("/admin/upload", methods=["POST"])
@admin_required
def admin_upload():
    if "file" not in request.files:
        flash("No file selected.", "error")
        return redirect(url_for("admin_upload_page"))

    file = request.files["file"]
    if file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("admin_upload_page"))

    if not allowed_file(file.filename):
        flash("Invalid file type. Only .xlsx, .xls, .csv allowed.", "error")
        return redirect(url_for("admin_upload_page"))

    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Read file to get metadata
    df = read_dataset_file(file_path)
    if df is None:
        os.remove(file_path)
        flash("Could not read the uploaded file.", "error")
        return redirect(url_for("admin_upload_page"))

    name = request.form.get("name", filename)
    category = request.form.get("category", "Other")
    division = request.form.get("division", "")
    district = request.form.get("district", "")
    area = request.form.get("area", "")
    description = request.form.get("description", "")
    price = request.form.get("price_credits", 10, type=int)

    db = get_db()
    db.execute(
        """INSERT INTO datasets (name, category, division, district, area, description,
           file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, category, division, district, area, description,
         file_path, len(df), ",".join(df.columns.tolist()), price, session["user_id"])
    )
    db.commit()
    db.close()

    flash(f"Dataset '{name}' uploaded successfully! ({len(df)} rows)", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/user/<int:user_id>/credits", methods=["POST"])
@admin_required
def admin_add_credits(user_id):
    amount = request.form.get("amount", 0, type=int)
    if amount <= 0:
        flash("Invalid amount.", "error")
        return redirect(url_for("admin_dashboard"))

    db = get_db()
    db.execute("UPDATE users SET credits = credits + ? WHERE id = ?", (amount, user_id))
    db.execute(
        "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)",
        (user_id, amount, "add", f"Credits added by admin")
    )
    db.commit()
    db.close()

    flash(f"Added {amount} credits to user #{user_id}.", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/dataset/<int:dataset_id>/delete", methods=["POST"])
@admin_required
def admin_delete_dataset(dataset_id):
    db = get_db()
    db.execute("UPDATE datasets SET is_active = 0 WHERE id = ?", (dataset_id,))
    db.commit()
    db.close()
    flash("Dataset removed.", "success")
    return redirect(url_for("admin_dashboard"))


# ═══════════════════════════════════════════════════════════
#  REGION API (for cascading dropdowns)
# ═══════════════════════════════════════════════════════════

@app.route("/api/regions")
def api_regions():
    return jsonify(REGIONS)


@app.route("/api/regions/<division>")
def api_districts(division):
    districts = REGIONS.get(division, {})
    return jsonify(districts)


@app.route("/api/regions/<division>/<district>")
def api_areas(division, district):
    areas = REGIONS.get(division, {}).get(district, [])
    return jsonify(areas)


# ═══════════════════════════════════════════════════════════
#  INIT & RUN
# ═══════════════════════════════════════════════════════════

def initialize():
    """Initialize the application"""
    init_db()
    create_admin_if_not_exists()

    # Seed demo dataset if exists
    demo_file = os.path.join(BASE_DIR, "coaching_centers_mirpur.xlsx")
    if os.path.exists(demo_file):
        seed_demo_dataset(demo_file)
    sanitized_file = os.path.join(BASE_DIR, "sanitized_coaching_centers.xlsx")
    if os.path.exists(sanitized_file):
        seed_demo_dataset(sanitized_file, "Coaching Centers (Sanitized)", "Coaching Center")


if __name__ == "__main__":
    initialize()
    print("\n" + "=" * 55)
    print("  DataBazaar — Data Marketplace & Scraping Service")
    print("  URL: http://localhost:5000")
    print("  Admin: admin@databazaar.com / admin123")
    print("=" * 55 + "\n")
    app.run(debug=True, port=5000)
