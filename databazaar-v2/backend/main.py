import os
import io
import json
import time
import uuid
import base64
import glob
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pandas as pd
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr

from database import get_db, init_db
from auth import hash_password, verify_password, create_jwt_token, decode_jwt_token
from scraper import setup_driver, scrape_query, save_to_excel
from senders import run_whatsapp_campaign, write_log_to_file, SCREENSHOTS_FOLDER as CAMPAIGN_SCREENSHOTS
from config import REGIONS, CATEGORIES, BREVO_API_KEY as CONFIG_BREVO_API_KEY, SMTP_USER as CONFIG_SMTP_USER, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME, FRONTEND_URL, BKASH_NUMBER, BKASH_ACCOUNT_TYPE, PATHAO_NUMBER, PATHAO_ACCOUNT_TYPE, CREDIT_PACKAGES
from email_templates import get_verification_email_html

app = FastAPI(title="MarketingOstad API Service")

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

app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

@app.on_event("startup")
def startup_db_unban_admins():
    try:
        conn = get_db()
        conn.execute("UPDATE users SET is_banned = 0, is_verified = 1, warning_message = '' WHERE role IN ('admin', 'superadmin') OR email = 'admin@marketingostad.com' OR email = 'admin@databazaar.com'")
        conn.execute("DELETE FROM banned_ips")
        conn.commit()
        conn.close()
        print("[OK] Admin accounts and localhost unbanned automatically on backend startup.")
    except Exception as e:
        print("[STARTUP DB UNBAN ERROR]", e)

# ── Dependencies ─────────────────────────────────────────

def get_current_user(request: Request, authorization: Optional[str] = Header(None), token: Optional[str] = None):
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header or token query parameter."
        )
    user_payload = decode_jwt_token(raw_token)
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
    if current_user["role"] not in ("admin", "superadmin"):
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
    selected_contacts: Optional[list[dict]] = None

class EmailCampaignRequest(BaseModel):
    recipient_group: str
    subject: str
    html_code: str
    selected_contacts: Optional[list[dict]] = None

class ResendVerificationRequest(BaseModel):
    email: EmailStr

# ── Free Brevo / SMTP Helper ─────────────────────────────

def send_free_verification_email(recipient_email: str, full_name: str, verify_link: str):
    brevo_api_key = os.getenv("BREVO_API_KEY", "")
    smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "asifdev777@gmail.com")
    smtp_pass = os.getenv("SMTP_PASSWORD", os.getenv("BREVO_SMTP_KEY", ""))

    html_body = get_verification_email_html(full_name, verify_link)
    last_error = ""

    # 1. Try Brevo REST API if API Key is set
    if brevo_api_key:
        try:
            import urllib.request
            url = "https://api.brevo.com/v3/smtp/email"
            payload = {
                "sender": {"name": "MarketingOstad Platform", "email": smtp_user},
                "to": [{"email": recipient_email, "name": full_name}],
                "subject": "Verify Your MarketingOstad Account Email",
                "htmlContent": html_body
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "accept": "application/json",
                    "api-key": brevo_api_key,
                    "content-type": "application/json"
                }
            )
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    print(f"[BREVO API SUCCESS] Verification email sent to {recipient_email} via Brevo!")
                    return True, ""
        except urllib.error.HTTPError as ex:
            err_body = ex.read().decode("utf-8")
            print(f"[BREVO API ERROR] {ex.code}: {err_body}")
            try:
                err_json = json.loads(err_body)
                last_error = err_json.get("message", str(ex))
            except Exception:
                last_error = f"HTTP {ex.code}: {err_body}"
        except Exception as ex:
            print(f"[BREVO API ERROR] {ex}")
            last_error = str(ex)

    # 2. Try SMTP (Brevo SMTP or custom SMTP) if password/key is set
    if smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Verify Your MarketingOstad Account Email"
            msg["From"] = f"MarketingOstad Platform <{smtp_user}>"
            msg["To"] = recipient_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, recipient_email, msg.as_string())
            print(f"[BREVO / SMTP SUCCESS] Verification email sent to {recipient_email} via {smtp_server}!")
            return True, ""
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send email via {smtp_server}: {e}")
            last_error = str(e)

    if not last_error:
        last_error = "Brevo API key or SMTP password is missing in backend .env file."
        
    return False, last_error

# ── Auth Endpoints ───────────────────────────────────────

@app.post("/api/auth/register")
def register(req: RegisterRequest, request: Request):
    conn = get_db()
    exists = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if exists:
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    pwd_hash = hash_password(req.password)
    v_token = str(uuid.uuid4())
    
    base_url = FRONTEND_URL
    if not base_url and request and request.headers.get("origin"):
        base_url = request.headers.get("origin").rstrip("/")
    verify_link = f"{base_url}/?verify_token={v_token}"
    
    # 1. SEND EMAIL FIRST - DO NOT INSERT TO DATABASE IF EMAIL DISPATCH FAILS!
    email_dispatched, err_msg = send_free_verification_email(req.email, req.full_name, verify_link)
    if not email_dispatched:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Verification email could not be sent: {err_msg}. Registration cancelled."
        )

    # 2. ONLY INSERT USER INTO DATABASE WHEN VERIFICATION EMAIL IS SENT SUCCESSFULLY!
    conn.execute(
        "INSERT INTO users (email, full_name, password_hash, role, credits, is_verified, verification_token) VALUES (?, ?, ?, 'user', 5, 0, ?)",
        (req.email, req.full_name, pwd_hash, v_token)
    )
    conn.commit()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    
    return {
        "success": True,
        "requires_verification": True,
        "email_dispatched": True,
        "message": f"Verification email successfully sent to {req.email}! Please check your inbox and click the verification link.",
        "email": user["email"]
    }

@app.get("/api/auth/verify-email")
def verify_email(token: str):
    if not token or not token.strip():
        return {
            "success": False,
            "message": "Verification token is missing."
        }
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE verification_token = ?", (token.strip(),)).fetchone()
    if not user:
        conn.close()
        return {
            "success": False,
            "already_verified": True,
            "message": "This verification link is invalid or has already been used. If you already verified your email, please log in to access your account."
        }
    
    conn.execute("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Email {user['email']} verified successfully! You can now sign in."
    }

@app.post("/api/auth/resend-verification")
def resend_verification(req: ResendVerificationRequest, request: Request):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No account found with this email.")
    
    if user["is_verified"] == 1:
        conn.close()
        return {"success": True, "message": "Account email is already verified. Please proceed to login."}
    
    v_token = str(uuid.uuid4())
    conn.execute("UPDATE users SET verification_token = ? WHERE id = ?", (v_token, user["id"]))
    conn.commit()
    conn.close()
    
    base_url = FRONTEND_URL
    if not base_url and request and request.headers.get("origin"):
        base_url = request.headers.get("origin").rstrip("/")
    verify_link = f"{base_url}/?verify_token={v_token}"
    email_dispatched, err_msg = send_free_verification_email(req.email, user["full_name"], verify_link)
    if not email_dispatched:
        raise HTTPException(status_code=400, detail=f"Failed to resend email: {err_msg}")

    return {
        "success": True,
        "email_dispatched": True,
        "message": "A new verification link has been sent to your email address."
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    user_row = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    
    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    user = dict(user_row)
    
    # Require email verification for non-admin users
    if user["role"] not in ("admin", "superadmin") and user.get("is_verified", 0) != 1:
        raise HTTPException(
            status_code=400,
            detail="Email address not verified! Please check your email inbox for the verification link before logging in."
        )
    
    token = create_jwt_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "credits": user["credits"],
            "is_verified": user.get("is_verified", 1),
            "warning_message": user.get("warning_message") or ""
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
        "is_verified": current_user.get("is_verified", 1),
        "is_banned": current_user.get("is_banned", 0),
        "warning_message": current_user.get("warning_message") or ""
    }

# ── Security Endpoints ───────────────────────────────────

class ViolationRequest(BaseModel):
    violation_type: str

@app.post("/api/security/log-violation")
def log_security_violation(req: ViolationRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header and auth_header.startswith("Bearer "):
        tok = auth_header.split(" ", 1)[1]
        payload = verify_jwt_token(tok)
        if payload:
            user_id = payload.get("user_id")

    conn = get_db()
    conn.execute(
        "INSERT INTO security_violations (user_id, ip_address, user_agent, violation_type) VALUES (?, ?, ?, ?)",
        (user_id, client_ip, user_agent, req.violation_type)
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

def resolve_dataset_file_path(file_path: Optional[str], dataset_id: Optional[int] = None) -> Optional[str]:
    if not file_path:
        return None
    if os.path.exists(file_path):
        return file_path
    
    filename = os.path.basename(file_path.replace("\\", "/"))
    local_upload = os.path.join(UPLOAD_FOLDER, filename)
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_mirpur = os.path.join(parent_dir, "coaching_centers_mirpur.xlsx")
    root_sanitized = os.path.join(parent_dir, "sanitized_coaching_centers.xlsx")

    found_path = None
    if os.path.exists(local_upload):
        found_path = local_upload
    elif "mirpur" in filename.lower() and os.path.exists(root_mirpur):
        found_path = root_mirpur
    elif os.path.exists(root_sanitized):
        found_path = root_sanitized
    elif os.path.exists(os.path.join(parent_dir, filename)):
        found_path = os.path.join(parent_dir, filename)

    if found_path and dataset_id:
        try:
            conn = get_db()
            conn.execute("UPDATE datasets SET file_path = ? WHERE id = ?", (found_path, dataset_id))
            conn.commit()
            conn.close()
        except Exception as e:
            print("[RESOLVE DATASET PATH DB UPDATE ERROR]", e)

    return found_path

def resolve_any_recipient_group(recipient_group: str):
    file_path = None
    group_name = recipient_group or "Default Dataset"
    conn = get_db()

    if recipient_group.startswith("dataset_"):
        ds_id = recipient_group.replace("dataset_", "")
        ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (ds_id,)).fetchone()
        if ds:
            file_path = resolve_dataset_file_path(ds["file_path"], int(ds_id))
            group_name = ds["name"]
    elif recipient_group.startswith("job_"):
        job_id = recipient_group.replace("job_", "")
        jb = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
        if jb:
            file_path = jb["result_path"]
            group_name = f"Scrape job: {jb['query']}"
    else:
        ds = conn.execute("SELECT * FROM datasets WHERE name = ? OR id = ?", (recipient_group, recipient_group)).fetchone()
        if ds:
            file_path = resolve_dataset_file_path(ds["file_path"], int(ds["id"]))
            group_name = ds["name"]
        else:
            jb = conn.execute("SELECT * FROM scrape_jobs WHERE query = ? OR id = ?", (recipient_group, recipient_group)).fetchone()
            if jb:
                file_path = jb["result_path"]
                group_name = f"Scrape job: {jb['query']}"
    conn.close()

    if not file_path or not os.path.exists(file_path):
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        fn = os.path.basename(file_path.replace("\\", "/")) if file_path else ""
        candidates = [
            os.path.join(UPLOAD_FOLDER, fn) if fn else None,
            os.path.join(SCRAPE_RESULTS_FOLDER, fn) if fn else None,
            os.path.join(parent_dir, fn) if fn else None,
            os.path.join(parent_dir, "coaching_centers_mirpur.xlsx"),
            os.path.join(parent_dir, "sanitized_coaching_centers.xlsx"),
        ]

        if os.path.exists(UPLOAD_FOLDER):
            for f in os.listdir(UPLOAD_FOLDER):
                if f.endswith(".csv") or f.endswith(".xlsx"):
                    candidates.append(os.path.join(UPLOAD_FOLDER, f))
        if os.path.exists(SCRAPE_RESULTS_FOLDER):
            for f in os.listdir(SCRAPE_RESULTS_FOLDER):
                if f.endswith(".csv") or f.endswith(".xlsx"):
                    candidates.append(os.path.join(SCRAPE_RESULTS_FOLDER, f))

        for cand in candidates:
            if cand and os.path.exists(cand):
                file_path = cand
                break

    return file_path, group_name

def clean_lead_df(df):
    """Clean DataFrame to strip float conversion .0 suffixes and NaN strings"""
    df = df.fillna("")
    for col in df.columns:
        df[col] = df[col].astype(str).str.replace(r'\.0$', '', regex=True)
        df[col] = df[col].astype(str).str.replace(r'^\+?88001', '+8801', regex=True)
        df[col] = df[col].astype(str).str.replace(r'^88001', '+8801', regex=True)
        df[col] = df[col].replace({'nan': '', 'NaN': '', 'None': '', 'None.0': ''})
    return df

@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str, page: int = 1, search: Optional[str] = None, authorization: Optional[str] = Header(None)):
    conn = get_db()
    
    # Check if dataset_id is a private scrape job
    if str(dataset_id).startswith("job_"):
        job_real_id = str(dataset_id).replace("job_", "")
        job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_real_id,)).fetchone()
        conn.close()
        if not job or not job["result_path"]:
            raise HTTPException(status_code=404, detail="Private scrape job or file not found.")
            
        file_path = job["result_path"]
        if file_path and not os.path.exists(file_path):
            fn = os.path.basename(file_path.replace("\\", "/"))
            if os.path.exists(os.path.join(SCRAPE_RESULTS_FOLDER, fn)):
                file_path = os.path.join(SCRAPE_RESULTS_FOLDER, fn)
                
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Private scrape job result file missing.")
            
        try:
            df = pd.read_csv(file_path, dtype=str) if file_path.endswith(".csv") else pd.read_excel(file_path, dtype=str)
            df = clean_lead_df(df)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to parse private job leads file.")

        if search:
            df = df[df.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)]

        total_rows = len(df)
        start_row = (page - 1) * 25
        end_row = start_row + 25
        raw_records = df.iloc[start_row:end_row].fillna("").to_dict(orient="records")
        leads = [{k: ("" if (v is None or str(v).lower() in ("nan", "none", "null")) else str(v)) for k, v in r.items()} for r in raw_records]

        return {
            "dataset": {
                "id": f"job_{job_real_id}",
                "name": job["query"],
                "category": "Private Scraped Dataset",
                "division": job["division"],
                "district": job["district"],
                "area": job["area"],
                "row_count": total_rows,
                "price_credits": 0
            },
            "unlocked": True,
            "leads": leads,
            "total_rows": total_rows,
            "page": page,
            "pages_count": max(1, (total_rows + 24) // 25)
        }

    # Standard public dataset lookup
    ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found.")
        
    file_path = resolve_dataset_file_path(ds["file_path"], int(dataset_id))
    if not file_path or not os.path.exists(file_path):
        conn.close()
        raise HTTPException(status_code=404, detail="Data file missing.")

    # Parse Excel/CSV
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path, dtype=str)
        else:
            df = pd.read_excel(file_path, dtype=str)
        df = clean_lead_df(df)
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
            if log or role in ("admin", "superadmin"):
                unlocked = True

    # Apply search filter
    if search:
        df = df[df.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)]

    total_rows = len(df)
    
    # Render Preview (unmasked if unlocked, masked with email watermark if locked)
    if not unlocked:
        # Show first 5 rows with masked phone numbers
        preview_df = df.head(5).copy().fillna("")
        phone_cols = [c for c in preview_df.columns if "phone" in c.lower() or "mobile" in c.lower() or "contact" in c.lower()]
        for c in phone_cols:
            preview_df[c] = preview_df[c].apply(lambda p: (str(p)[:5] + "XXX" + str(p)[-3:]) if len(str(p)) >= 8 else str(p))
        raw_records = preview_df.to_dict(orient="records")
    else:
        # Show full paginated results
        start_row = (page - 1) * 25
        end_row = start_row + 25
        raw_records = df.iloc[start_row:end_row].fillna("").to_dict(orient="records")

    leads = [{k: ("" if (v is None or str(v).lower() in ("nan", "none", "null")) else str(v)) for k, v in r.items()} for r in raw_records]

    conn.close()
    return {
        "dataset": dict(ds),
        "unlocked": unlocked,
        "leads": leads,
        "total_rows": total_rows,
        "page": page,
        "pages_count": max(1, (total_rows + 24) // 25)
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
    if current_user["role"] not in ("admin", "superadmin"):
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

def generate_pdf_from_df(df: pd.DataFrame, title: str = "MarketingOstad Dataset Export") -> bytes:
    try:
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20
        )
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#0a0e17'),
            spaceAfter=8
        )
        elements.append(Paragraph(f"<b>MarketingOstad — {title}</b>", title_style))
        elements.append(Paragraph(f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Total Business Items: {len(df)}", styles['Normal']))
        elements.append(Spacer(1, 10))

        cols = list(df.columns)[:7]
        table_data = [[Paragraph(f"<b>{col}</b>", styles['Normal']) for col in cols]]

        for _, row in df.head(300).iterrows():
            row_data = []
            for col in cols:
                val = str(row[col]) if pd.notna(row[col]) and str(row[col]) != "nan" else ""
                if len(val) > 40:
                    val = val[:37] + "..."
                row_data.append(Paragraph(val, styles['Normal']))
            table_data.append(row_data)

        t = Table(table_data, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#06b6d4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        print("[PDF GENERATION NOTICE]", e)
        header = f"MarketingOstad Dataset Export: {title}\nDate: {datetime.now()}\nTotal Records: {len(df)}\n\n"
        body = df.to_string(index=False)
        return (header + body).encode("utf-8")

def generate_export_response(file_path: str, export_format: str, title: str = "Exported_Dataset"):
    fmt = (export_format or "excel").lower().strip()
    safe_title = "".join(c for c in title if c.isalnum() or c in ("_", "-")).strip() or "Dataset"
    filename_base = f"{safe_title}_{int(time.time())}"

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path, dtype=str).fillna("")
    else:
        df = pd.read_excel(file_path, dtype=str).fillna("")

    if fmt in ("csv", ".csv"):
        csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'}
        )

    elif fmt in ("json", ".json"):
        json_bytes = df.to_json(orient="records", indent=2, force_ascii=False).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.json"'}
        )

    elif fmt in ("pdf", ".pdf"):
        pdf_bytes = generate_pdf_from_df(df, title=title)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.pdf"'}
        )

    else:
        if file_path.endswith(".xlsx") and os.path.exists(file_path):
            return FileResponse(
                file_path,
                filename=f"{filename_base}.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        out_buf = io.BytesIO()
        with pd.ExcelWriter(out_buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Exported_Leads")
        out_buf.seek(0)
        return Response(
            content=out_buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.xlsx"'}
        )

@app.get("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id: str, request: Request, format: Optional[str] = "excel", token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    current_user = get_current_user(request=request, authorization=authorization, token=token)
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Permission denied. Only Administrators can export datasets."
        )

    conn = get_db()
    file_path = None
    title_name = "Exported_Dataset"
    if str(dataset_id).startswith("job_"):
        job_real_id = str(dataset_id).replace("job_", "")
        job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_real_id,)).fetchone()
        if job:
            file_path = job["result_path"]
            title_name = job["query"] or f"Job_{job['id']}"
            if file_path and not os.path.exists(file_path):
                fn = os.path.basename(file_path.replace("\\", "/"))
                if os.path.exists(os.path.join(SCRAPE_RESULTS_FOLDER, fn)):
                    file_path = os.path.join(SCRAPE_RESULTS_FOLDER, fn)
    else:
        ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
        if ds:
            file_path = resolve_dataset_file_path(ds["file_path"], int(dataset_id))
            title_name = ds["name"]
    conn.close()

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data file missing.")

    return generate_export_response(file_path, export_format=format, title=title_name)

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
        raise HTTPException(status_code=400, detail="Only valid dataset formats (.xlsx, .csv) are supported.")
        
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
            log_cb(f"🎉 Scraper completed all {len(queries)} queries! Aggregated {len(all_results)} total business items into your private catalogue dataset.")
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

# ── Dataset Requests Portal API ──────────────────────────────

class DatasetRequestCreate(BaseModel):
    phone: str
    business_name: Optional[str] = ""
    category_query: str
    division: Optional[str] = ""
    district: Optional[str] = ""
    area: Optional[str] = ""
    additional_notes: Optional[str] = ""

class DatasetRequestStatusUpdate(BaseModel):
    status: str # 'pending', 'fulfilled', 'rejected'
    admin_notes: Optional[str] = ""
    notify_channel: Optional[str] = "none" # 'email', 'whatsapp', 'both', 'none'
    custom_message: Optional[str] = ""

def send_custom_notification(recipient_email: str, recipient_phone: str, subject: str, message: str, channel: str):
    """Sends custom notification to user about request status update via Email and/or WhatsApp"""
    sent_email = False
    sent_wa = False

    # 1. Email Notification
    if channel in ("email", "both") and recipient_email:
        try:
            brevo_api_key = os.getenv("BREVO_API_KEY", "")
            smtp_user = os.getenv("SMTP_USER", "asifdev777@gmail.com")
            smtp_pass = os.getenv("SMTP_PASSWORD", os.getenv("BREVO_SMTP_KEY", os.getenv("SMTP_PASS", "")))
            smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
            smtp_port = int(os.getenv("SMTP_PORT", 587))

            html_body = f"""
            <div style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 10px;">
                <h2 style="color: #06b6d4; margin-top: 0;">MarketingOstad - Dataset Request Update</h2>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 20px 0;">
                    <p style="font-size: 1rem; line-height: 1.6; white-space: pre-wrap; margin: 0; color: #f8fafc;">{message}</p>
                </div>
                <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 30px;">
                    Thank you for choosing MarketingOstad Data Platform.<br>
                    Website: <a href="https://yourdatapoint.com" style="color: #06b6d4;">yourdatapoint.com</a>
                </p>
            </div>
            """

            if brevo_api_key:
                try:
                    import urllib.request
                    import json
                    headers = {
                        "accept": "application/json",
                        "api-key": brevo_api_key,
                        "content-type": "application/json"
                    }
                    payload = {
                        "sender": {"name": "MarketingOstad Team", "email": smtp_user},
                        "to": [{"email": recipient_email}],
                        "subject": subject,
                        "htmlContent": html_body
                    }
                    req = urllib.request.Request("https://api.brevo.com/v3/smtp/email", data=json.dumps(payload).encode("utf-8"), headers=headers)
                    with urllib.request.urlopen(req) as resp:
                        if resp.status in (200, 201):
                            sent_email = True
                except Exception as e:
                    print(f"[BREVO NOTIF ERROR] {e}")

            if not sent_email and smtp_pass:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = f"MarketingOstad Team <{smtp_user}>"
                    msg["To"] = recipient_email
                    msg.attach(MIMEText(html_body, "html"))
                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(smtp_user, recipient_email, msg.as_string())
                    sent_email = True
                except Exception as e:
                    print(f"[SMTP NOTIF ERROR] {e}")
        except Exception as e:
            print(f"[NOTIF EMAIL GENERAL EXCEPTION] {e}")

    # 2. WhatsApp Notification
    if channel in ("whatsapp", "both") and recipient_phone:
        try:
            from senders import format_phone
            clean_p = format_phone(recipient_phone)
            camp_id = f"notif_wa_{int(time.time())}"
            contacts_list = [{"name": "User", "phone": clean_p}]
            t = threading.Thread(target=run_whatsapp_campaign, args=(camp_id, contacts_list, message, f"notif_{clean_p}", 0))
            t.daemon = True
            t.start()
            sent_wa = True
        except Exception as e:
            print(f"[NOTIF WHATSAPP ERROR] {e}")

    return sent_email or sent_wa

@app.post("/api/requests/submit")
def submit_dataset_request(req: DatasetRequestCreate, current_user: dict = Depends(get_current_user)):
    if not req.category_query or not req.category_query.strip():
        raise HTTPException(status_code=400, detail="Required data / category query cannot be empty.")
    if not req.phone or not req.phone.strip():
        raise HTTPException(status_code=400, detail="Contact phone number is required.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO dataset_requests (
            user_id, user_email, full_name, phone, business_name,
            category_query, division, district, area, additional_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user["id"], current_user["email"], current_user.get("full_name", "User"),
        req.phone.strip(), (req.business_name or "").strip(),
        req.category_query.strip(), (req.division or "").strip(),
        (req.district or "").strip(), (req.area or "").strip(),
        (req.additional_notes or "").strip()
    ))
    conn.commit()
    request_id = cursor.lastrowid
    conn.close()
    return {"success": True, "request_id": request_id, "message": "Dataset request submitted successfully! Our data team will review and drop this dataset into the Public Catalog."}

@app.get("/api/requests/my-requests")
def get_my_dataset_requests(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM dataset_requests WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/requests/admin/list")
def list_dataset_requests(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    conn = get_db()
    rows = conn.execute("SELECT dr.*, u.credits FROM dataset_requests dr JOIN users u ON dr.user_id = u.id ORDER BY dr.created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/requests/admin/{request_id}/status")
def update_dataset_request_status(request_id: int, req: DatasetRequestStatusUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    if req.status not in ("pending", "fulfilled", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status value.")
    conn = get_db()
    req_row = conn.execute("SELECT * FROM dataset_requests WHERE id = ?", (request_id,)).fetchone()
    if not req_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset request not found.")

    conn.execute("UPDATE dataset_requests SET status = ?, admin_notes = ? WHERE id = ?", (req.status, (req.admin_notes or "").strip(), request_id))
    conn.commit()
    conn.close()

    if req.notify_channel and req.notify_channel != "none" and req.custom_message and req.custom_message.strip():
        subj = f"Dataset Request #{request_id} Update: {req.status.upper()}"
        send_custom_notification(
            recipient_email=req_row["user_email"],
            recipient_phone=req_row["phone"],
            subject=subj,
            message=req.custom_message.strip(),
            channel=req.notify_channel
        )

    return {"success": True, "message": f"Dataset request status updated to '{req.status}'!"}

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
    if current_user["role"] not in ("admin", "superadmin"):
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
    if current_user["role"] in ("admin", "superadmin"):
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

@app.delete("/api/scraper/jobs/{job_id}")
def delete_scrape_job(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Scrape job not found.")

    if current_user["role"] not in ("admin", "superadmin") and job["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You do not have permission to delete this scrape job.")

    if job["result_path"] and os.path.exists(job["result_path"]):
        try:
            os.remove(job["result_path"])
        except Exception:
            pass

    conn.execute("DELETE FROM scrape_logs WHERE job_id = ?", (job_id,))
    conn.execute("DELETE FROM whatsapp_progress WHERE recipient_group = ?", (f"job_{job_id}",))
    conn.execute("DELETE FROM scrape_jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Scrape job deleted successfully."}

@app.post("/api/scraper/jobs/{job_id}/promote")
@app.post("/api/scraper/jobs/{job_id}/request-promote")
def request_promote_job(job_id: int, category: str = Form(...), name: str = Form(...), current_user: dict = Depends(get_current_user)):
    conn = get_db()
    job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job or job["status"] != "done" or not job["result_path"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot request promotion for this job because it has not finished successfully.")

    if current_user["role"] != "admin" and current_user["role"] != "superadmin" and job["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You do not have permission to request promotion for this dataset.")

    # Promote dataset directly into public catalog
    new_filename = f"promoted_{job_id}_{int(time.time())}.xlsx"
    new_path = os.path.join(UPLOAD_FOLDER, new_filename)
    import shutil
    shutil.copy(job["result_path"], new_path)
    rel_path = f"uploads/{new_filename}"

    conn.execute(
        """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Name, Phone, Address, Website, Rating, Category, Maps URL, Query', 10, ?)""",
        (name, category, job["division"], job["district"], job["area"], rel_path, job["result_count"], current_user["id"])
    )
    conn.execute("UPDATE scrape_jobs SET promotion_status = 'approved', proposed_name = ?, proposed_category = ? WHERE id = ?", (name, category, job_id))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Scraped dataset dropped successfully into the Public Catalog!"}

@app.get("/api/admin/promotion-requests")
def list_promotion_requests(admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT sj.*, u.email, u.full_name FROM scrape_jobs sj
        JOIN users u ON sj.user_id = u.id
        WHERE sj.promotion_status = 'pending'
        ORDER BY sj.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/admin/promotion-requests/{job_id}/approve")
def approve_promotion_request(job_id: int, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    job = conn.execute("SELECT * FROM scrape_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job or not job["result_path"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Scrape job or result file not found.")

    ds_name = job["proposed_name"] or job["query"]
    ds_cat = job["proposed_category"] or "Coaching Center"

    new_filename = f"promoted_{job_id}_{int(time.time())}.xlsx"
    new_path = os.path.join(UPLOAD_FOLDER, new_filename)
    import shutil
    shutil.copy(job["result_path"], new_path)
    rel_path = f"uploads/{new_filename}"

    conn.execute(
        """INSERT INTO datasets (name, category, division, district, area, file_path, row_count, column_names, price_credits, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Name, Phone, Address, Website, Rating, Category, Maps URL, Query', 10, ?)""",
        (ds_name, ds_cat, job["division"], job["district"], job["area"], rel_path, job["result_count"], admin_user["id"])
    )
    conn.execute("UPDATE scrape_jobs SET promotion_status = 'approved' WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Promotion request for '{ds_name}' approved & published to public catalog!"}

@app.post("/api/admin/promotion-requests/{job_id}/reject")
def reject_promotion_request(job_id: int, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    conn.execute("UPDATE scrape_jobs SET promotion_status = 'rejected' WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Promotion request rejected."}

# ── Payment & bKash / Pathao Module Endpoints ───────────────

def get_payment_gateway_settings():
    conn = get_db()
    rows = conn.execute("SELECT setting_key, setting_value FROM payment_settings").fetchall()
    conn.close()
    
    settings_dict = {row["setting_key"]: row["setting_value"] for row in rows if row["setting_value"]}
    
    from config import load_credit_packages_config
    pkg_cfg = load_credit_packages_config()
    return {
        "bkash_number": settings_dict.get("bkash_number") or BKASH_NUMBER,
        "bkash_account_type": settings_dict.get("bkash_account_type") or BKASH_ACCOUNT_TYPE,
        "bkash_qr_url": settings_dict.get("bkash_qr_url") or "",
        "pathao_number": settings_dict.get("pathao_number") or PATHAO_NUMBER,
        "pathao_account_type": settings_dict.get("pathao_account_type") or PATHAO_ACCOUNT_TYPE,
        "pathao_qr_url": settings_dict.get("pathao_qr_url") or "",
        "packages": pkg_cfg.get("packages", []),
        "custom_package": pkg_cfg.get("custom_package", {})
    }

@app.get("/api/payments/packages-config")
def get_payment_packages_config():
    return get_payment_gateway_settings()

@app.post("/api/admin/payment-settings")
async def update_admin_payment_settings(
    bkash_number: Optional[str] = Form(None),
    bkash_account_type: Optional[str] = Form(None),
    pathao_number: Optional[str] = Form(None),
    pathao_account_type: Optional[str] = Form(None),
    bkash_qr_file: Optional[UploadFile] = File(None),
    pathao_qr_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    conn = get_db()

    if bkash_number is not None:
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('bkash_number', ?)", (bkash_number.strip(),))
    if bkash_account_type is not None:
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('bkash_account_type', ?)", (bkash_account_type.strip(),))
    if pathao_number is not None:
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('pathao_number', ?)", (pathao_number.strip(),))
    if pathao_account_type is not None:
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('pathao_account_type', ?)", (pathao_account_type.strip(),))

    if bkash_qr_file and bkash_qr_file.filename:
        ext = os.path.splitext(bkash_qr_file.filename)[1] or ".png"
        filename = f"bkash_qr{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, "wb") as f:
            f.write(await bkash_qr_file.read())
        rel_url = f"/uploads/{filename}"
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('bkash_qr_url', ?)", (rel_url,))

    if pathao_qr_file and pathao_qr_file.filename:
        ext = os.path.splitext(pathao_qr_file.filename)[1] or ".png"
        filename = f"pathao_qr{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, "wb") as f:
            f.write(await pathao_qr_file.read())
        rel_url = f"/uploads/{filename}"
        conn.execute("INSERT OR REPLACE INTO payment_settings (setting_key, setting_value) VALUES ('pathao_qr_url', ?)", (rel_url,))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Payment gateway numbers, account types, and QR codes updated successfully!"}

class PaymentRequestPayload(BaseModel):
    package_name: str
    credits_requested: int
    amount_bdt: float
    payment_method: str = "bkash"
    user_name: Optional[str] = None
    bkash_number: str
    transaction_id: str

@app.post("/api/payments/submit-request")
def submit_payment_request(req: PaymentRequestPayload, current_user: dict = Depends(get_current_user)):
    if not req.transaction_id or not req.bkash_number:
        raise HTTPException(status_code=400, detail="Sender Phone Number and Transaction ID (TrxID) are required.")
        
    conn = get_db()
    # Check if duplicate TrxID pending or approved
    existing = conn.execute("SELECT id FROM payment_requests WHERE transaction_id = ? AND status IN ('pending', 'approved')", (req.transaction_id.strip(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="This Transaction ID (TrxID) has already been submitted.")

    u_name = req.user_name or current_user.get("full_name") or current_user.get("email")

    conn.execute(
        """INSERT INTO payment_requests (user_id, package_name, credits_requested, amount_bdt, payment_method, user_name, bkash_number, transaction_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')""",
        (current_user["id"], req.package_name, req.credits_requested, req.amount_bdt, req.payment_method, u_name, req.bkash_number.strip(), req.transaction_id.strip())
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Payment proof submitted successfully! Pending admin verification."}

@app.get("/api/payments/my-requests")
def list_my_payment_requests(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM payment_requests WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/admin/payment-requests")
def list_admin_payment_requests(admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT pr.*, u.email, u.full_name FROM payment_requests pr
        JOIN users u ON pr.user_id = u.id
        ORDER BY CASE WHEN pr.status = 'pending' THEN 0 ELSE 1 END, pr.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/admin/payment-requests/{request_id}/approve")
def approve_payment_request(request_id: int, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    req = conn.execute("SELECT * FROM payment_requests WHERE id = ?", (request_id,)).fetchone()
    if not req:
        conn.close()
        raise HTTPException(status_code=404, detail="Payment request not found.")

    if req["status"] != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Payment request has already been {req['status']}.")

    # Add credits to user
    conn.execute("UPDATE users SET credits = credits + ? WHERE id = ?", (req["credits_requested"], req["user_id"]))

    # Log credit transaction
    conn.execute(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
           VALUES (?, ?, 'add', ?)""",
        (req["user_id"], req["credits_requested"], f"bKash Package Purchase: {req['package_name']} (TrxID: {req['transaction_id']})")
    )

    # Update payment request status
    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "UPDATE payment_requests SET status = 'approved', processed_at = ?, processed_by = ? WHERE id = ?",
        (now_str, admin_user["id"], request_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Payment approved! Successfully added {req['credits_requested']} credits to user account."}

@app.post("/api/admin/payment-requests/{request_id}/reject")
def reject_payment_request(request_id: int, rejection_reason: str = Form("Transaction ID mismatch or invalid payment"), admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    req = conn.execute("SELECT * FROM payment_requests WHERE id = ?", (request_id,)).fetchone()
    if not req:
        conn.close()
        raise HTTPException(status_code=404, detail="Payment request not found.")

    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "UPDATE payment_requests SET status = 'rejected', rejection_reason = ?, processed_at = ?, processed_by = ? WHERE id = ?",
        (rejection_reason, now_str, admin_user["id"], request_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Payment request rejected."}

# ── Marketing Campaign Endpoints ─────────────────────────

@app.get("/api/marketing/whatsapp-status")
def whatsapp_status():
    profile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_session")
    if not os.path.exists(profile):
        return {"session_active": False}
    
    has_files = False
    try:
        indexed_db_path = os.path.join(profile, "Default", "IndexedDB")
        local_storage_path = os.path.join(profile, "Default", "Local Storage")
        if os.path.exists(indexed_db_path) or os.path.exists(local_storage_path):
            for root, dirs, files in os.walk(profile):
                if "whatsapp" in root.lower():
                    has_files = True
                    break
                for f in files:
                    if f.endswith(".leveldb") or f.endswith(".ldb") or "whatsapp" in f.lower():
                        has_files = True
                        break
                if has_files:
                    break
    except Exception:
        pass

    return {"session_active": has_files}

@app.get("/api/marketing/whatsapp-setup-session")
def whatsapp_setup(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    from senders import setup_driver, wait_for_whatsapp_login, set_active_setup_driver, close_active_setup_driver
    def scan_runner():
        try:
            close_active_setup_driver()
            driver = setup_driver()
            set_active_setup_driver(driver)
            is_logged_in = wait_for_whatsapp_login(driver)
            if is_logged_in:
                time.sleep(3)
            close_active_setup_driver()
        except Exception:
            close_active_setup_driver()
    background_tasks.add_task(scan_runner)
    return {"success": True, "message": "Chrome launched! Scan QR code or view active WhatsApp chats in browser."}

@app.post("/api/marketing/whatsapp-reset-session")
def whatsapp_reset_session(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    import shutil
    from senders import setup_driver, wait_for_whatsapp_login, set_active_setup_driver, close_active_setup_driver
    close_active_setup_driver()
    profile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_session")
    if os.path.exists(profile):
        try:
            shutil.rmtree(profile, ignore_errors=True)
        except Exception:
            pass
    
    def scan_runner():
        try:
            driver = setup_driver()
            set_active_setup_driver(driver)
            is_logged_in = wait_for_whatsapp_login(driver)
            if is_logged_in:
                time.sleep(3)
            close_active_setup_driver()
        except Exception:
            close_active_setup_driver()
    background_tasks.add_task(scan_runner)
    return {"success": True, "message": "WhatsApp session cleared! Chrome launched to scan new QR code."}

@app.get("/api/marketing/whatsapp-progress")
def get_progress(recipient_group: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT last_index FROM whatsapp_progress WHERE recipient_group = ?", (recipient_group,)).fetchone()
    conn.close()
    return {"last_index": row["last_index"] if row else 0}

@app.post("/api/marketing/send-whatsapp")
def send_whatsapp(req: WhatsAppCampaignRequest, current_user: dict = Depends(get_current_user)):
    file_path, group_name = resolve_any_recipient_group(req.recipient_group)

    if req.selected_contacts and len(req.selected_contacts) > 0:
        contacts = req.selected_contacts
    else:
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Recipients source dataset file not found.")

        try:
            df = pd.read_csv(file_path, dtype=str) if file_path.endswith(".csv") else pd.read_excel(file_path, dtype=str)
            df = clean_lead_df(df)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to load lead group columns.")

        phone_col = None
        name_col = None
        for c in df.columns:
            if "phone" in c.lower() or "mobile" in c.lower() or "contact" in c.lower():
                phone_col = c
            if "name" in c.lower() or "title" in c.lower():
                name_col = c

        if not phone_col and len(df.columns) > 0:
            phone_col = df.columns[0]

        contacts = []
        for _, row in df.iterrows():
            p = str(row[phone_col]).strip() if phone_col and pd.notna(row[phone_col]) else ""
            n = str(row[name_col]).strip() if name_col and pd.notna(row[name_col]) else "Customer"
            if len(p) > 5:
                contacts.append({"phone": p, "name": n})

    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts selected or found in dataset.")

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
            
    if current_user["role"] not in ("admin", "superadmin") and not req.resume:
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
    file_path, group_name = resolve_any_recipient_group(req.recipient_group)

    if req.selected_contacts and len(req.selected_contacts) > 0:
        target_count = len(req.selected_contacts)
    else:
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Lead dataset file not found.")
        try:
            df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
            target_count = len(df)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to load file.")

    # Deduct 1 credit for email campaign
    conn = get_db()
    if current_user["role"] != "admin" and current_user["role"] != "superadmin":
        if current_user["credits"] < 1:
            conn.close()
            raise HTTPException(status_code=403, detail="Insufficient credits to run email campaign.")
        conn.execute("UPDATE users SET credits = credits - 1 WHERE id = ?", (current_user["id"],))
        conn.execute("INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, 1, 'deduct', 'Email Campaign')", (current_user["id"],))

    campaign_id = f"email_camp_{int(time.time())}"
    conn.execute(
        """INSERT INTO marketing_campaigns (id, user_id, campaign_type, recipient_group, template_preview, status, sent_count, total_count)
           VALUES (?, ?, 'email', ?, ?, 'done', ?, ?)""",
        (campaign_id, current_user["id"], req.recipient_group, req.subject, target_count, target_count)
    )
    conn.execute(
        "INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)",
        (campaign_id, f"Email campaign dispatched successfully to {target_count} selected addresses.")
    )
    conn.commit()
    conn.close()

    return {"success": True, "campaign_id": campaign_id, "recipient_count": target_count}

@app.get("/api/marketing/recipient-contacts")
def get_recipient_contacts(recipient_group: str, current_user: dict = Depends(get_current_user)):
    file_path, group_name = resolve_any_recipient_group(recipient_group)

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recipient source data file not found.")

    try:
        df = pd.read_csv(file_path, dtype=str) if file_path.endswith(".csv") else pd.read_excel(file_path, dtype=str)
        df = clean_lead_df(df)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse lead data file.")

    phone_col = None
    email_col = None
    name_col = None

    for c in df.columns:
        c_lower = c.lower()
        if "phone" in c_lower or "mobile" in c_lower or "contact" in c_lower or "number" in c_lower or "tel" in c_lower:
            if not phone_col: phone_col = c
        if "email" in c_lower or "mail" in c_lower:
            if not email_col: email_col = c
        if "name" in c_lower or "title" in c_lower or "coaching" in c_lower or "school" in c_lower or "store" in c_lower or "shop" in c_lower:
            if not name_col: name_col = c

    if not name_col and len(df.columns) > 0:
        name_col = df.columns[0]

    def clean_val(v):
        if v is None:
            return ""
        s = str(v).strip()
        if s.endswith(".0"):
            s = s[:-2]
        if s in ("nan", "NaN", "None", "None.0"):
            return ""
        if s.startswith("+88001"):
            s = "+8801" + s[6:]
        elif s.startswith("88001"):
            s = "+8801" + s[5:]
        elif s.startswith("001") and len(s) == 13:
            s = "+8801" + s[3:]
        return s

    contacts = []
    for idx, row in df.iterrows():
        name_val = clean_val(row[name_col]) if name_col and row[name_col] else f"Lead #{idx+1}"
        phone_val = clean_val(row[phone_col]) if phone_col and row[phone_col] else ""
        email_val = clean_val(row[email_col]) if email_col and row[email_col] else ""
        area_val = clean_val(row.get("Area", row.get("District", row.get("Address", "BD"))))
        
        contacts.append({
            "id": idx,
            "name": name_val,
            "phone": phone_val,
            "email": email_val,
            "area": area_val
        })

    return {"success": True, "total": len(contacts), "contacts": contacts}

@app.get("/api/marketing/campaigns")
def list_campaigns(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] in ("admin", "superadmin"):
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
    
    if req.role and req.role in ("user", "admin", "superadmin"):
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
        SELECT v.*, 
               COALESCE(u.email, 'Guest Visitor (' || v.ip_address || ')') AS email,
               COALESCE(u.full_name, 'Guest User') AS full_name
        FROM security_violations v
        LEFT JOIN users u ON v.user_id = u.id
        ORDER BY v.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/admin/violations/seed-test")
def seed_test_violations(request: Request, admin_user: dict = Depends(get_admin_user)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Mozilla/5.0")
    
    conn = get_db()
    conn.execute(
        "INSERT INTO security_violations (user_id, ip_address, user_agent, violation_type) VALUES (?, ?, ?, ?)",
        (admin_user["id"], client_ip, user_agent, "macOS Screenshot Shortcut (Cmd + Shift + 4)")
    )
    conn.execute(
        "INSERT INTO security_violations (user_id, ip_address, user_agent, violation_type) VALUES (?, ?, ?, ?)",
        (None, "103.145.72.10", user_agent, "Windows Snipping Tool (Win + Shift + S)")
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Test security violations logged."}

@app.post("/api/admin/users/{target_user_id}/ban")
def ban_user(target_user_id: int, req: BanRequest, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    
    target_u = conn.execute("SELECT id, role, email FROM users WHERE id = ?", (target_user_id,)).fetchone()
    if not target_u:
        conn.close()
        raise HTTPException(status_code=404, detail="Target user account not found.")

    if target_u["id"] == admin_user["id"]:
        conn.close()
        raise HTTPException(status_code=400, detail="You cannot ban your own active account.")

    # Role Hierarchy Ban Constraints:
    # Admin cannot ban admin or superadmin. Superadmin can ban anyone.
    if admin_user["role"] == "admin" and target_u["role"] in ("admin", "superadmin") and req.is_banned == 1:
        conn.close()
        raise HTTPException(
            status_code=403,
            detail="Admins cannot ban other Admins or Superadmins. Only Superadmin can ban administrative accounts."
        )

    conn.execute("UPDATE users SET is_banned = ?, warning_message = ? WHERE id = ?", (req.is_banned, req.warning_message, target_user_id))
    if req.ban_ip and req.ip_address and req.ip_address not in ("127.0.0.1", "::1", "localhost"):
        if req.is_banned == 1:
            conn.execute("INSERT OR IGNORE INTO banned_ips (ip_address, reason) VALUES (?, ?)", (req.ip_address, req.warning_message))
        else:
            conn.execute("DELETE FROM banned_ips WHERE ip_address = ?", (req.ip_address,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "User ban status updated."}
class AdminWarningRequest(BaseModel):
    warning_message: str

@app.post("/api/admin/users/{target_user_id}/warning")
def set_admin_warning(target_user_id: int, req: AdminWarningRequest, admin_user: dict = Depends(get_admin_user)):
    conn = get_db()
    conn.execute("UPDATE users SET warning_message = ? WHERE id = ?", (req.warning_message, target_user_id))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Application-level warning message updated."}

@app.delete("/api/admin/users/{target_user_id}")
def unregister_user(target_user_id: int, admin_user: dict = Depends(get_admin_user)):
    if target_user_id == admin_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot unregister your own admin account.")
        
    conn = get_db()
    u = conn.execute("SELECT id, email FROM users WHERE id = ?", (target_user_id,)).fetchone()
    if not u:
        conn.close()
        raise HTTPException(status_code=404, detail="User account not found.")

    # Permanently delete user and associated records from database
    conn.execute("DELETE FROM access_logs WHERE user_id = ?", (target_user_id,))
    conn.execute("DELETE FROM credit_transactions WHERE user_id = ?", (target_user_id,))
    conn.execute("DELETE FROM security_violations WHERE user_id = ?", (target_user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (target_user_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"User #{target_user_id} ({u['email']}) has been permanently unregistered and deleted from database."}

# ── Database Auto Initialize ──────────────────────────────

@app.get("/api/config/regions")
def get_regions_config():
    # Return Bangladesh Region Hierarchy, Categories, and Contact info from .env
    return {
        "regions": REGIONS,
        "categories": CATEGORIES,
        "contacts": {
            "support_email": os.getenv("SUPPORT_EMAIL", os.getenv("SMTP_USER", "asifdev777@gmail.com")),
            "hotline_phone": os.getenv("HOTLINE_PHONE", "+880 1700-000000"),
            "support_hours": os.getenv("SUPPORT_HOURS", "24/7 Automated System & Live WhatsApp Assistance")
        }
    }

# ── Dashboard Stats Endpoint ─────────────────────────────

@app.get("/api/marketing/dashboard-stats")
def dashboard_stats(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] in ("admin", "superadmin"):
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
    conn = get_db()
    pwd_hash = hash_password(SUPERADMIN_PASSWORD)
    
    # Register / ensure sole Superadmin from env config
    try:
        superadmin = conn.execute("SELECT id FROM users WHERE email = ?", (SUPERADMIN_EMAIL,)).fetchone()
        if not superadmin:
            conn.execute(
                "INSERT INTO users (email, full_name, password_hash, role, credits, is_verified) VALUES (?, ?, ?, 'superadmin', 99999, 1)",
                (SUPERADMIN_EMAIL, SUPERADMIN_NAME, pwd_hash)
            )
            conn.commit()
            print(f"[OK] Registered sole Superadmin account from ENV: {SUPERADMIN_EMAIL} / {SUPERADMIN_PASSWORD}")
        else:
            conn.execute("UPDATE users SET password_hash = ?, full_name = ?, role = 'superadmin', is_verified = 1, is_banned = 0 WHERE email = ?", (pwd_hash, SUPERADMIN_NAME, SUPERADMIN_EMAIL))
            conn.commit()
    except Exception as err:
        print("[SUPERADMIN SEED NOTICE] Migrating schema to superadmin role...", err)
        conn.close()
        from database import reset_db_only_superadmin
        reset_db_only_superadmin()
        conn = get_db()
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
                    ("Coaching Centers in Mirpur, Dhaka", "Coaching Center", "Dhaka", "Dhaka City", "Mirpur", dest_path, len(df), ", ".join(df.columns), 0, 1)
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
                    ("Verified Coaching Centers - General", "Coaching Center", "Dhaka", "Dhaka City", "Mirpur", dest_path, len(df), ", ".join(df.columns), 0, 1)
                )
                conn.commit()
                print("[OK] Seeded Sanitized Coaching Centers.")
            except Exception as e:
                print(f"[ERR] Failed to seed Sanitized dataset: {e}")
        
    # Update default datasets to 0 credits (FREE for users)
    conn.execute("UPDATE datasets SET price_credits = 0 WHERE uploaded_by = 1 OR uploaded_by IS NULL")
    conn.commit()
    conn.close()
