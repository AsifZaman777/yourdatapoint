"""
CampusBaba — Excel Sanitizer & Filter
Filters out already sent numbers and duplicates from Excel,
preserves them in another log, and creates a fresh sanitized Excel file.
"""

import pandas as pd
from datetime import datetime

# ── Config ──────────────────────────────────────────────
RAW_EXCEL_FILE        = "coaching_centers_mirpur.xlsx"
SANITIZED_EXCEL_FILE  = "sanitized_coaching_centers.xlsx"
SHEET_NAME            = "Coaching Centers"
PHONE_COL             = "Phone"
NAME_COL              = "Name"
LOG_FILE              = "sent_log.txt"
FILTERED_LOG_FILE     = "filtered_log.txt"
FILTERED_DETAILS_FILE = "filtered_details.txt"
# ────────────────────────────────────────────────────────


def load_sent_log():
    """Load list of already sent numbers"""
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    except FileNotFoundError:
        return set()


def load_filtered_log():
    """Load list of already logged filtered numbers"""
    try:
        with open(FILTERED_LOG_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    except FileNotFoundError:
        return set()


def log_filtered(phone, name, reason):
    """Save filtered-out contact to another log file"""
    with open(FILTERED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{phone}\n")
    with open(FILTERED_DETAILS_FILE, "a", encoding="utf-8") as f:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        f.write(f"{timestamp} | {phone} | {name} | Reason: {reason}\n")


def sanitize_excel():
    print("\n" + "="*55)
    print("  CampusBaba — Excel Sanitizer & Filter")
    print("  Filtering already sent numbers & duplicates...")
    print("="*55)

    try:
        df = pd.read_excel(RAW_EXCEL_FILE, sheet_name=SHEET_NAME)
    except Exception as e:
        print(f"❌ Could not open '{RAW_EXCEL_FILE}': {e}")
        return

    total_contacts = len(df)

    # Clean phone numbers
    df[PHONE_COL] = df[PHONE_COL].astype(str).str.strip()
    df[PHONE_COL] = df[PHONE_COL].str.replace(r'[^0-9+]', '', regex=True)

    sent = load_sent_log()
    existing_filtered = load_filtered_log()

    newly_filtered_count = 0
    already_sent_count = 0
    duplicate_count = 0
    invalid_count = 0

    valid_rows = []
    seen_phones = set()

    for i, row in df.iterrows():
        phone = str(row[PHONE_COL])
        name = str(row.get(NAME_COL, "N/A"))

        # 1. Check if phone is too short / invalid
        if len(phone) <= 7:
            invalid_count += 1
            if phone not in existing_filtered:
                log_filtered(phone, name, "Invalid Phone Number")
                existing_filtered.add(phone)
                newly_filtered_count += 1
            continue

        # 2. Check if already sent (skip without logging to filter log, as it's already in sent_log)
        if phone in sent:
            already_sent_count += 1
            continue

        # 3. Check if duplicate contact in sheet
        if phone in seen_phones:
            duplicate_count += 1
            if phone not in existing_filtered:
                log_filtered(phone, name, "Duplicate Contact")
                existing_filtered.add(phone)
                newly_filtered_count += 1
            continue

        # Pass all filters: keep contact
        seen_phones.add(phone)
        valid_rows.append(row)

    df_clean = pd.DataFrame(valid_rows)

    try:
        df_clean.to_excel(SANITIZED_EXCEL_FILE, sheet_name=SHEET_NAME, index=False)
        print(f"✅ Saved fresh sanitized list to: {SANITIZED_EXCEL_FILE}")
    except Exception as e:
        print(f"❌ Error saving sanitized Excel: {e}")

    print("\n" + "="*55)
    print("  📊 SANITIZATION SUMMARY")
    print(f"  Total rows examined         : {total_contacts}")
    print(f"  📤 Filtered (Already Sent)  : {already_sent_count}")
    print(f"  🔄 Filtered (Duplicates)    : {duplicate_count}")
    if invalid_count > 0:
        print(f"  ❌ Filtered (Invalid Phone) : {invalid_count}")
    print(f"  📝 New contacts logged      : {newly_filtered_count}")
    print(f"  📁 Filter logs saved to     : {FILTERED_LOG_FILE} & {FILTERED_DETAILS_FILE}")
    print(f"  📋 Fresh sanitized remaining: {len(df_clean)}")
    print("="*55 + "\n")
    print(f"💡 Now you can run 'python message_sender.py' to send messages from '{SANITIZED_EXCEL_FILE}'!")


if __name__ == "__main__":
    sanitize_excel()
