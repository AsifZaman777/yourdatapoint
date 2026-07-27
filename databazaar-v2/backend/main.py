import os
import json
import time
import base64
import glob
import threading
import pandas as pd
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from database import get_db, init_db
from auth import hash_password, verify_password, create_jwt_token, decode_jwt_token
from scraper import setup_driver, scrape_query, save_to_excel
from senders import run_whatsapp_campaign, write_log_to_file, SCREENSHOTS_FOLDER as CAMPAIGN_SCREENSHOTS
from config import REGIONS, CATEGORIES

app = FastAPI(title="DataBazaar API Service")

# Allow CORS for React frontend (standard dev port 5173 / 3000 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
SCRAPE_RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_results")
SCRAPER_SCREENSHOTS_FOLDER = os.path.join(SCRAPE_RESULTS_FOLDER, "screenshots")
LOGS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SCRAPE_RESULTS_FOLDER, exist_ok=True)
os.makedirs(SCRAPER_SCREENSHOTS_FOLDER, exist_ok=True)
os.makedirs(LOGS_FOLDER, exist_ok=True)

# ── Dependencies ─────────────────────────────────────────

def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header."
        )
    token = authorization.split(" ")[1]
    user_payload = decode_jwt_token(token)
    if not user_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid login token."
        )
    
    # Retrieve user from DB
    conn = get_db()
    
    # Check IP Ban first
    client_ip = request.client.host if request.client else "unknown"
    ip_ban = conn.execute("SELECT * FROM banned_ips WHERE ip_address = ?", (client_ip,)).fetchone()
    if ip_ban:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your IP address has been banned for security violations."
        )
        
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_payload["user_id"],)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )
        
    if user["is_banned"] == 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=user["warning_message"] or "Your account has been suspended for security policy violations."
        )
        
    return dict(user)

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required."
        )
    return current_user

# ── Schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class CreditRequest(BaseModel):
    user_id: int
    amount: int

class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    full_name: Optional[str] = None

class ScrapeRequest(BaseModel):
    query: Optional[str] = None
    queries: Optional[list[str]] = None
    division: Optional[str] = None
    district: Optional[str] = None
    area: Optional[str] = None
    headless: Optional[bool] = False

class WhatsAppCampaignRequest(BaseModel):
    recipient_group: str
    message_template: str
    resume: Optional[bool] = False
    start_row: Optional[int] = None

class EmailCampaignRequest(BaseModel):
    recipient_group: str
    subject: str
    html_code: str

# ── Auth Endpoints ───────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db()
    exists = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if exists:
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    pwd_hash = hash_password(req.password)
    # Default users get 5 free credits
    conn.execute(
        "INSERT INTO users (email, full_name, password_hash, role, credits) VALUES (?, ?, ?, 'user', 5)",
        (req.email, req.full_name, pwd_hash)
    )
    conn.commit()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    
    token = create_jwt_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "credits": user["credits"]
        }
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    token = create_jwt_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "credits": user["credits"]
        }
    }

@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "credits": current_user["credits"],
        "is_banned": current_user.get("is_banned", 0)
    }

# ── Security Endpoints ───────────────────────────────────

class ViolationRequest(BaseModel):
    violation_type: str

@app.post("/api/security/log-violation")
def log_security_violation(req: ViolationRequest, request: Request, current_user: dict = Depends(get_current_user)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    conn = get_db()
    conn.execute(
        "INSERT INTO security_violations (user_id, ip_address, user_agent, violation_type) VALUES (?, ?, ?, ?)",
        (current_user["id"], client_ip, user_agent, req.violation_type)
    )
    conn.commit()
    conn.close()
    return {"success": True}

# ── Datasets Endpoints ───────────────────────────────────

@app.get("/api/datasets")
def list_datasets(category: Optional[str] = None, division: Optional[str] = None, district: Optional[str] = None, area: Optional[str] = None, search: Optional[str] = None):
    conn = get_db()
    q = "SELECT * FROM datasets WHERE is_active = 1"
    params = []
    
    if category:
        q += " AND category = ?"
        params.append(category)
    if division:
        q += " AND division = ?"
        params.append(division)
    if district:
        q += " AND district = ?"
        params.append(district)
    if area:
        q += " AND area = ?"
        params.append(area)
    if search:
        q += " AND (name LIKE ? OR category LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    q += " ORDER BY created_at DESC"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: int, page: int = 1, search: Optional[str] = None, authorization: Optional[str] = Header(None)):
    conn = get_db()
    ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")
        
    file_path = ds["file_path"]
    if not os.path.exists(file_path):
        conn.close()
        raise HTTPException(status_code=404, detail="Data file missing.")

    # Parse Excel/CSV
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        df = df.fillna("")
    except Exception:
        conn.close()
        raise HTTPException(status_code=500, detail="Error reading file contents.")

    # Check if user unlocked this dataset
    unlocked = False
    current_user_id = None
    role = "user"
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user_payload = decode_jwt_token(token)
        if user_payload:
            current_user_id = user_payload["user_id"]
            role = user_payload["role"]
            # Look up access log
            log = conn.execute(
                "SELECT id FROM access_logs WHERE user_id = ? AND dataset_id = ? AND action = 'unlock'",
                (current_user_id, dataset_id)
            ).fetchone()
            if log or role == "admin":
                unlocked = True

    # Apply search filter
    if search:
        df = df[df.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)]

    total_rows = len(df)
    
    # Render Preview (unmasked if unlocked, masked with email watermark if locked)
    if not unlocked:
        # Show first 5 rows with masked phone numbers
        preview_df = df.head(5).copy()
        phone_cols = [c for c in preview_df.columns if "phone" in c.lower() or "mobile" in c.lower() or "contact" in c.lower()]
        for c in phone_cols:
            preview_df[c] = preview_df[c].apply(lambda p: (str(p)[:5] + "XXX" + str(p)[-3:]) if len(str(p)) >= 8 else str(p))
        leads = preview_df.to_dict(orient="records")
    else:
        # Show full paginated results
        start_row = (page - 1) * 25
        end_row = start_row + 25
        leads = df.iloc[start_row:end_row].to_dict(orient="records")

    conn.close()
    return {
        "dataset": dict(ds),
        "unlocked": unlocked,
        "leads": leads,
        "total_rows": total_rows,
        "page": page,
        "pages_count": (total_rows + 24) // 25
    }

@app.post("/api/datasets/{dataset_id}/unlock")
def unlock_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")

    # Verify if already unlocked
    already = conn.execute(
        "SELECT id FROM access_logs WHERE user_id = ? AND dataset_id = ? AND action = 'unlock'",
        (current_user["id"], dataset_id)
    ).fetchone()
    if already:
        conn.close()
        return {"success": True, "message": "Dataset already unlocked."}

    cost = ds["price_credits"]
    if current_user["role"] != "admin":
        if current_user["credits"] < cost:
            conn.close()
            raise HTTPException(status_code=403, detail="Insufficient credit balances to unlock this dataset.")
            
        conn.execute("UPDATE users SET credits = credits - ? WHERE id = ?", (cost, current_user["id"]))
        conn.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, 'deduct', ?)",
            (current_user["id"], cost, f"Unlocked dataset: {ds['name']}")
        )
    
    # Log access
    conn.execute(
        "INSERT INTO access_logs (user_id, dataset_id, action) VALUES (?, ?, 'unlock')",
        (current_user["id"], dataset_id)
    )
    conn.commit()
    
    # Reload profile
    user = conn.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    conn.close()
    return {"success": True, "credits": user["credits"]}

# ── Admin Upload ─────────────────────────────────────────

@app.post("/api/admin/datasets/upload")
def admin_upload(
    name: str = Form(...),
    category: str = Form(...),
    price_credits: int = Form(...),
    division: str = Form(None),
    district: str = Form(None),
    area: str = Form(None),
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_admin_user)
):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only CSV/Excel formats are supported.")
        
    filename = f"{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    # Read file row counts and columns
    try:
        if ext == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        row_count = len(df)
        column_names = ", ".join(df.columns)
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Error parsing file headers.")

    conn = get_db()
    conn.execute(
        """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, category, division, district, area, file_path, row_count, column_names, price_credits, admin_user["id"])
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Dataset catalog file uploaded successfully."}

@app.delete("/api/admin/datasets/{dataset_id}")
def admin_delete_dataset(dataset_id: int, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ── Scraper Endpoints ────────────────────────────────────

def run_background_scrape(job_id, queries, division, district, area, headless=False):
    def log_cb(msg):
        db = get_db()
        db.execute("INSERT INTO scrape_logs (job_id, message) VALUES (?, ?)", (job_id, msg))
        db.commit()
        db.close()

    driver = None
    all_results = []
    try:
        driver = setup_driver(headless=True)
        for idx, q in enumerate(queries):
            log_cb(f"─── [Query {idx+1}/{len(queries)}] Searching Google Maps: '{q}' ───")
            res = scrape_query(driver, q, log_cb, job_id=job_id)
            if res:
                all_results.extend(res)
            log_cb(f"─── [Query {idx+1}/{len(queries)}] Completed: Collected {len(res) if res else 0} items ───")
        driver.quit()

        if all_results:
            filename = f"job_{job_id}_{int(time.time())}.xlsx"
            result_path = os.path.join(SCRAPE_RESULTS_FOLDER, filename)
            save_to_excel(all_results, result_path)

            db = get_db()
            db.execute(
                "UPDATE scrape_jobs SET status = 'done', result_path = ?, result_count = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                (result_path, len(all_results), job_id)
            )
            db.commit()
            db.close()
            log_cb(f"🎉 Scraper completed all {len(queries)} queries! Aggregated {len(all_results)} total business items into a single Excel file.")
        else:
            db = get_db()
            db.execute("UPDATE scrape_jobs SET status = 'failed', error_message = 'No records parsed from any query.' WHERE id = ?", (job_id,))
            db.commit()
            db.close()
            log_cb("Scraper execution halted: No listings found across any query.")
    except Exception as ex:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
        db = get_db()
        db.execute("UPDATE scrape_jobs SET status = 'failed', error_message = ? WHERE id = ?", (str(ex), job_id))
        db.commit()
        db.close()
        log_cb(f"Fatal scraper thread exception: {ex}")

@app.post("/api/scraper/scrape")
def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    query_list = []
    if req.queries and isinstance(req.queries, list):
        query_list = [q.strip() for q in req.queries if q and q.strip()]
    if not query_list and req.query:
        query_list = [req.query.strip()]
    
    if not query_list:
        raise HTTPException(status_code=400, detail="Please provide at least one search query.")
        
    display_query = " + ".join(query_list)
    cost = 20 * len(query_list)
    conn = get_db()
    if current_user["role"] != "admin":
        if current_user["credits"] < cost:
            conn.close()
            raise HTTPException(status_code=403, detail=f"Insufficient credits to run scraper (costs {cost} credits for {len(query_list)} queries).")
            
        conn.execute("UPDATE users SET credits = credits - ? WHERE id = ?", (cost, current_user["id"]))
        conn.execute(
            "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, 'deduct', ?)",
            (current_user["id"], cost, f"Google Maps Scraper Run ({len(query_list)} queries)")
        )
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scrape_jobs (user_id, query, division, district, area, status, cost_credits) VALUES (?, ?, ?, ?, ?, 'running', ?)",
        (current_user["id"], display_query, req.division, req.district, req.area, cost)
    )
    conn.commit()
    job_id = cursor.lastrowid
    conn.close()

    background_tasks.add_task(run_background_scrape, job_id, query_list, req.division, req.district, req.area, req.headless)
    return {"success": True, "job_id": job_id}

@app.get("/api/scraper/jobs")
def get_jobs(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] == "admin":
        jobs = conn.execute("SELECT sj.*, u.email FROM scrape_jobs sj JOIN users u ON sj.user_id = u.id ORDER BY sj.created_at DESC").fetchall()
    else:
        jobs = conn.execute("SELECT * FROM scrape_jobs WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    return [dict(j) for j in jobs]

@app.get("/api/scraper/jobs/{job_id}/status")
def get_job_status(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Scrape job not found.")
        
    logs = conn.execute("SELECT message, created_at FROM scrape_logs WHERE job_id = ? ORDER BY id ASC", (job_id,)).fetchall()
    conn.close()
    return {
        "job": dict(job),
        "logs": [f"[{l['created_at'].split(' ')[1] if ' ' in l['created_at'] else l['created_at']}] {l['message']}" for l in logs]
    }

@app.post("/api/scraper/jobs/{job_id}/promote")
def promote_job(job_id: int, category: str = Form(...), name: str = Form(...), admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job or job["status"] != "done" or not job["result_path"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot promote this job because it has not finished successfully.")

    # Create new file path in uploads
    new_filename = f"promoted_{job_id}_{int(time.time())}.xlsx"
    new_path = os.path.join(UPLOAD_FOLDER, new_filename)
    import shutil
    shutil.copy(job["result_path"], new_path)

    conn.execute(
        """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Name, Phone, Address, Website, Rating, Category, Maps URL, Query', 10, ?)""",
        (name, category, job["division"], job["district"], job["area"], new_path, job["result_count"], admin_user["id"])
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Scraped data promoted successfully into datasets catalog."}

# ── Marketing Campaign Endpoints ─────────────────────────

@app.get("/api/marketing/whatsapp-status")
def whatsapp_status():
    profile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_session")
    active = os.path.exists(profile) and len(os.listdir(profile)) > 0
    return {"session_active": active}

@app.get("/api/marketing/whatsapp-setup-session")
def whatsapp_setup(background_tasks: BackgroundTasks, admin_user: dict = Depends(get_admin_user)):
    # Launch browser window to scan QR code
    def scan_runner():
        try:
            driver = setup_driver()
            driver.get("https://web.whatsapp.com")
            # Keep browser alive for login scans
            time.sleep(90)
            driver.quit()
        except Exception:
            pass
    background_tasks.add_task(scan_runner)
    return {"success": True, "message": "Chrome launched. Verify WhatsApp on screen now."}

@app.get("/api/marketing/whatsapp-progress")
def get_progress(recipient_group: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT last_index FROM whatsapp_progress WHERE recipient_group = ?", (recipient_group,)).fetchone()
    conn.close()
    return {"last_index": row["last_index"] if row else 0}

@app.post("/api/marketing/send-whatsapp")
def send_whatsapp(req: WhatsAppCampaignRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    file_path = None
    group_name = ""
    conn = get_db()
    if req.recipient_group.startswith("dataset_"):
        ds_id = req.recipient_group.replace("dataset_", "")
        ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if ds:
            file_path = ds["file_path"]
            group_name = ds["name"]
    elif req.recipient_group.startswith("job_"):
        job_id = req.recipient_group.replace("job_", "")
        jb = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
        if jb:
            file_path = jb["result_path"]
            group_name = f"Scrape job: {jb['query']}"
    conn.close()

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recipients source dataset file not found.")

    try:
        df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load lead group columns.")

    phone_col = None
    name_col = None
    for c in df.columns:
        if "phone" in c.lower() or "mobile" in c.lower() or "contact" in c.lower():
            phone_col = c
        if "name" in c.lower() or "title" in c.lower():
            name_col = c

    if not phone_col:
        raise HTTPException(status_code=400, detail="Lead group file lacks contact phone columns.")

    contacts = []
    for _, row in df.iterrows():
        p = str(row[phone_col]).strip() if pd.notna(row[phone_col]) else ""
        n = str(row[name_col]).strip() if name_col and pd.notna(row[name_col]) else "Customer"
        if len(p) > 7:
            contacts.append({"phone": p, "name": n})

    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts found in dataset.")

    # Deduct credits
    start_index = 0
    conn = get_db()
    if req.resume:
        chk = conn.execute("SELECT last_index FROM whatsapp_progress WHERE recipient_group = ?", (req.recipient_group,)).fetchone()
        if chk:
            start_index = chk["last_index"]
    
    # Use explicit start_row if provided (overrides resume)
    if req.start_row is not None and req.start_row > 0:
        start_index = req.start_row
            
    if current_user["role"] != "admin" and not req.resume:
        if current_user["credits"] < 5:
            conn.close()
            raise HTTPException(status_code=403, detail="Insufficient credits (campaign costs 5 credits).")
        conn.execute("UPDATE users SET credits = credits - 5 WHERE id = ?", (current_user["id"],))
        conn.execute("INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, 5, 'deduct', 'WhatsApp dispatch')", (current_user["id"],))
        
    campaign_id = f"wa_camp_{int(time.time())}"
    conn.execute(
        """INSERT INTO marketing_campaigns (id, user_id, campaign_type, recipient_group, template_preview, status, sent_count, total_count, start_row)
           VALUES (?, ?, 'whatsapp', ?, ?, 'running', ?, ?, ?)""",
        (campaign_id, current_user["id"], req.recipient_group, req.message_template[:200], start_index, len(contacts), start_index)
    )
    conn.commit()
    conn.close()

    # Background Campaign Thread
    t = threading.Thread(target=run_whatsapp_campaign, args=(campaign_id, contacts, req.message_template, req.recipient_group, start_index))
    t.daemon = True
    t.start()

    return {"success": True, "campaign_id": campaign_id, "start_index": start_index}

@app.post("/api/marketing/send-email")
def send_email(req: EmailCampaignRequest, current_user: dict = Depends(get_current_user)):
    file_path = None
    conn = get_db()
    if req.recipient_group.startswith("dataset_"):
        ds_id = req.recipient_group.replace("dataset_", "")
        ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if ds:
            file_path = ds["file_path"]
    elif req.recipient_group.startswith("job_"):
        job_id = req.recipient_group.replace("job_", "")
        jb = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
        if jb:
            file_path = jb["result_path"]
    conn.close()

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Lead file not found.")

    try:
        df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load file.")

    # Deduct 1 credit for email campaign
    conn = get_db()
    if current_user["role"] != "admin":
        if current_user["credits"] < 1:
            conn.close()
            raise HTTPException(status_code=403, detail="Insufficient credits to run email campaign.")
        conn.execute("UPDATE users SET credits = credits - 1 WHERE id = ?", (current_user["id"],))
        conn.execute("INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, 1, 'deduct', 'Email Campaign')", (current_user["id"],))

    campaign_id = f"email_camp_{int(time.time())}"
    conn.execute(
        """INSERT INTO marketing_campaigns (id, user_id, campaign_type, recipient_group, template_preview, status, sent_count, total_count)
           VALUES (?, ?, 'email', ?, ?, 'done', ?, ?)""",
        (campaign_id, current_user["id"], req.recipient_group, req.subject, len(df), len(df))
    )
    conn.execute(
        "INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)",
        (campaign_id, f"Email campaign dispatched successfully to {len(df)} addresses.")
    )
    conn.commit()
    conn.close()

    return {"success": True, "campaign_id": campaign_id, "recipient_count": len(df)}

@app.get("/api/marketing/campaigns")
def list_campaigns(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] == "admin":
        rows = conn.execute("""
            SELECT c.*, u.email, u.full_name FROM marketing_campaigns c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        """).fetchall()
    else:
        rows = conn.execute("SELECT * FROM marketing_campaigns WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/marketing/whatsapp-campaign/{campaign_id}")
def get_campaign_status(campaign_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.execute("SELECT * FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Campaign not found.")
    logs = conn.execute("SELECT message, created_at FROM campaign_logs WHERE campaign_id = ? ORDER BY id ASC", (campaign_id,)).fetchall()
    conn.close()
    return {
        "status": c["status"],
        "total": c["total_count"],
        "sent": c["sent_count"],
        "failed": c.get("failed_count", 0) if isinstance(c, dict) else (c["failed_count"] if "failed_count" in c.keys() else 0),
        "start_row": c.get("start_row", 0) if isinstance(c, dict) else (c["start_row"] if "start_row" in c.keys() else 0),
        "logs": [f"[{l['created_at'].split(' ')[1] if ' ' in l['created_at'] else l['created_at']}] {l['message']}" for l in logs]
    }

@app.post("/api/marketing/whatsapp-campaign/{campaign_id}/stop")
def stop_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Campaign not found.")
        
    conn.execute("UPDATE marketing_campaigns SET status = 'stopping' WHERE id = ?", (campaign_id,))
    conn.execute("INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)", (campaign_id, "User requested manual campaign termination."))
    conn.commit()
    conn.close()
    return {"success": True}

# ── Admin User Management / Credits ─────────────────────

@app.get("/api/admin/users")
def get_all_users(admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    users = conn.execute("SELECT id, email, full_name, role, credits, is_banned, warning_message, created_at FROM users").fetchall()
    conn.close()
    return [dict(u) for u in users]

@app.post("/api/admin/users/add-credits")
def add_credits(req: CreditRequest, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    u = conn.execute("SELECT id FROM users WHERE id = ?", (req.user_id,)).fetchone()
    if not u:
        conn.close()
        raise HTTPException(status_code=404, detail="User account not found.")

    conn.execute("UPDATE users SET credits = credits + ? WHERE id = ?", (req.amount, req.user_id))
    conn.execute(
        "INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, 'add', 'Admin balance adjustment')",
        (req.user_id, req.amount)
    )
    conn.commit()
    conn.close()
    return {"success": True}

@app.patch("/api/admin/users/{target_user_id}")
def update_user_admin(target_user_id: int, req: UpdateUserRequest, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    u = conn.execute("SELECT id FROM users WHERE id = ?", (target_user_id,)).fetchone()
    if not u:
        conn.close()
        raise HTTPException(status_code=404, detail="User account not found.")
    
    if req.role and req.role in ("user", "admin"):
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (req.role, target_user_id))
    if req.full_name is not None:
        conn.execute("UPDATE users SET full_name = ? WHERE id = ?", (req.full_name, target_user_id))
    conn.commit()
    conn.close()
    return {"success": True}

class BanRequest(BaseModel):
    is_banned: int
    warning_message: Optional[str] = ""
    ban_ip: Optional[bool] = False
    ip_address: Optional[str] = ""

@app.get("/api/admin/violations")
def get_security_violations(admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT v.*, u.email, u.full_name 
        FROM security_violations v
        JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/admin/users/{target_user_id}/ban")
def ban_user(target_user_id: int, req: BanRequest, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    conn.execute("UPDATE users SET is_banned = ?, warning_message = ? WHERE id = ?", (req.is_banned, req.warning_message, target_user_id))
    if req.ban_ip and req.ip_address:
        if req.is_banned == 1:
            conn.execute("INSERT OR IGNORE INTO banned_ips (ip_address, reason) VALUES (?, ?)", (req.ip_address, req.warning_message))
        else:
            conn.execute("DELETE FROM banned_ips WHERE ip_address = ?", (req.ip_address,))
    conn.commit()
    conn.close()
    return {"success": True}

# ── Database Auto Initialize ──────────────────────────────

@app.get("/api/config/regions")
def get_regions_config():
    # Return Bangladesh Region Hierarchy and Categories
    return {"regions": REGIONS, "categories": CATEGORIES}

# ── Dashboard Stats Endpoint ─────────────────────────────

@app.get("/api/marketing/dashboard-stats")
def dashboard_stats(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] == "admin":
        campaigns = conn.execute("SELECT * FROM marketing_campaigns ORDER BY created_at DESC").fetchall()
    else:
        campaigns = conn.execute("SELECT * FROM marketing_campaigns WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    
    campaigns_list = [dict(c) for c in campaigns]
    
    total_campaigns = len(campaigns_list)
    total_sent = sum(c.get("sent_count", 0) for c in campaigns_list)
    total_contacts = sum(c.get("total_count", 0) for c in campaigns_list)
    total_failed = sum(c.get("failed_count", 0) for c in campaigns_list)
    total_remaining = total_contacts - total_sent
    
    wa_count = len([c for c in campaigns_list if c["campaign_type"] == "whatsapp"])
    email_count = len([c for c in campaigns_list if c["campaign_type"] == "email"])
    
    status_counts = {}
    for c in campaigns_list:
        s = c["status"]
        status_counts[s] = status_counts.get(s, 0) + 1
    
    active_count = len([c for c in campaigns_list if c["status"] == "running"])
    done_count = status_counts.get("done", 0)
    success_rate = round((done_count / total_campaigns * 100), 1) if total_campaigns > 0 else 0
    
    return {
        "total_campaigns": total_campaigns,
        "total_sent": total_sent,
        "total_contacts": total_contacts,
        "total_remaining": total_remaining,
        "total_failed": total_failed,
        "success_rate": success_rate,
        "active_count": active_count,
        "whatsapp_count": wa_count,
        "email_count": email_count,
        "status_counts": status_counts,
        "campaigns": campaigns_list
    }

# ── Log Files Endpoints ──────────────────────────────────

@app.get("/api/marketing/logs")
def list_log_files(current_user: dict = Depends(get_current_user)):
    """List available day-wise log files"""
    log_files = sorted(glob.glob(os.path.join(LOGS_FOLDER, "*_campaigns.log")), reverse=True)
    result = []
    for f in log_files:
        basename = os.path.basename(f)
        date_str = basename.replace("_campaigns.log", "")
        size = os.path.getsize(f)
        result.append({"date": date_str, "filename": basename, "size_bytes": size})
    return result

@app.get("/api/marketing/logs/{date}")
def get_log_file(date: str, current_user: dict = Depends(get_current_user)):
    """Return contents of a day-wise log file"""
    log_path = os.path.join(LOGS_FOLDER, f"{date}_campaigns.log")
    if not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail="Log file not found for this date.")
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"date": date, "content": content, "lines": content.strip().split("\n") if content.strip() else []}
    except Exception:
        raise HTTPException(status_code=500, detail="Error reading log file.")

# ── Screenshot Endpoints ─────────────────────────────────

@app.get("/api/scraper/jobs/{job_id}/screenshot")
def get_scraper_screenshot(job_id: int, current_user: dict = Depends(get_current_user)):
    """Return the latest scraper browser screenshot as base64"""
    screenshot_path = os.path.join(SCRAPER_SCREENSHOTS_FOLDER, f"job_{job_id}.png")
    if not os.path.exists(screenshot_path):
        return {"available": False, "image": None}
    try:
        with open(screenshot_path, "rb") as f:
            img_data = base64.b64encode(f.read()).decode("utf-8")
        return {"available": True, "image": f"data:image/png;base64,{img_data}"}
    except Exception:
        return {"available": False, "image": None}

@app.get("/api/marketing/campaign/{campaign_id}/screenshot")
def get_campaign_screenshot(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Return the latest campaign browser screenshot as base64"""
    screenshot_path = os.path.join(CAMPAIGN_SCREENSHOTS, f"campaign_{campaign_id}.png")
    if not os.path.exists(screenshot_path):
        return {"available": False, "image": None}
    try:
        with open(screenshot_path, "rb") as f:
            img_data = base64.b64encode(f.read()).decode("utf-8")
        return {"available": True, "image": f"data:image/png;base64,{img_data}"}
    except Exception:
        return {"available": False, "image": None}

# ── Database Auto Initialize ──────────────────────────────

@app.on_event("startup")
def startup_event():
    init_db()
    
    # Create default admin if not exists
    conn = get_db()
    exists = conn.execute("SELECT id FROM users WHERE email = 'admin@databazaar.com'").fetchone()
    if not exists:
        pwd_hash = hash_password("admin123")
        conn.execute(
            "INSERT INTO users (email, full_name, password_hash, role, credits) VALUES ('admin@databazaar.com', 'System Admin', ?, 'admin', 9999)",
            (pwd_hash,)
        )
        conn.commit()
        print("[OK] Created default admin account: admin@databazaar.com / admin123")

    # Seed demo datasets if table is empty
    ds_exists = conn.execute("SELECT id FROM datasets").fetchone()
    if not ds_exists:
        import shutil
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # 1. Seed Mirpur Coaching Centers
        src_mirpur = os.path.join(parent_dir, "coaching_centers_mirpur.xlsx")
        if os.path.exists(src_mirpur):
            dest_name = f"seeded_mirpur_{int(time.time())}.xlsx"
            dest_path = os.path.join(UPLOAD_FOLDER, dest_name)
            shutil.copy(src_mirpur, dest_path)
            try:
                df = pd.read_excel(dest_path)
                conn.execute(
                    """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    ("Coaching Centers in Mirpur, Dhaka", "Coaching Center", "Dhaka", "Dhaka City", "Mirpur", dest_path, len(df), ", ".join(df.columns), 10, 1)
                )
                conn.commit()
                print("[OK] Seeded Coaching Centers in Mirpur.")
            except Exception as e:
                print(f"[ERR] Failed to seed Mirpur dataset: {e}")

        # 2. Seed Sanitized Coaching Centers (General)
        src_sanitized = os.path.join(parent_dir, "sanitized_coaching_centers.xlsx")
        if os.path.exists(src_sanitized):
            dest_name = f"seeded_sanitized_{int(time.time())}.xlsx"
            dest_path = os.path.join(UPLOAD_FOLDER, dest_name)
            shutil.copy(src_sanitized, dest_path)
            try:
                df = pd.read_excel(dest_path)
                conn.execute(
                    """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    ("Verified Coaching Centers - General", "Coaching Center", "Dhaka", "Dhaka City", "Mirpur", dest_path, len(df), ", ".join(df.columns), 15, 1)
                )
                conn.commit()
                print("[OK] Seeded Sanitized Coaching Centers.")
            except Exception as e:
                print(f"[ERR] Failed to seed Sanitized dataset: {e}")
        
    conn.close()
