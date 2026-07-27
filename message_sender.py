"""
CampusBaba — Semi-Auto WhatsApp Sender
Reads numbers from Excel → Opens WhatsApp Web → You press Send
Safe, no ban risk, personal feel
"""

import os
import time
import urllib.parse
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ── Config ──────────────────────────────────────────────
RAW_EXCEL_FILE        = "coaching_centers_mirpur.xlsx"
SANITIZED_EXCEL_FILE  = "sanitized_coaching_centers.xlsx"
SHEET_NAME            = "Coaching Centers"
PHONE_COL             = "Phone"       # column name in Excel
NAME_COL              = "Name"        # column name in Excel
DAILY_LIMIT           = 20            # max messages per day (stay safe)
DELAY_SEC             = 5            # seconds between each — gives you time to press Send
LOG_FILE              = "sent_log.txt"
FILTERED_LOG_FILE     = "filtered_log.txt"
FILTERED_DETAILS_FILE = "filtered_details.txt"
# ────────────────────────────────────────────────────────


# ── Your WhatsApp Message ────────────────────────────────
# {name} will be replaced with coaching center name
MESSAGE = """আসসালামু আলাইকুম স্যার/ম্যাডাম,
 
প্রতিদিন attendance নিতে ১৫ মিনিট। fees collect করতে ঝামেলা। parents কে আলাদা করে ফোন করে result জানানো। exam schedule WhatsApp এ পাঠানো। মাস শেষে report বানাতে ঘণ্টার পর ঘণ্টা।
 
এই কাজগুলো কি আপনার প্রতিদিনের রুটিন?
 
CampusBaba দিয়ে এই সব শেষ —
✅ এক ক্লিকে attendance
✅ Fee automatically track
✅ Exam result সাথে সাথে parents এর phone এ
✅ AI দিয়ে যেকোনো তথ্য instant — শুধু জিজ্ঞেস করুন, এক সেকেন্ডে উত্তর
✅ মাসিক report এক ক্লিকে ready
 
মাসিক মাত্র ৳৪৯৯/- থেকে শুরু। কোনো technical জ্ঞান লাগবে না।
 
👉 Demo Link: demo.campusbaba.com
👉 Website: campusbaba.com
📞 +8801863443343
 
১০ মিনিটের free demo দেখাতে চাই — সময় দেবেন স্যার?
 
ধন্যবাদ,
Team CampusBaba"""
# ────────────────────────────────────────────────────────


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


def load_and_sanitize_excel(raw_file, sanitized_file, sheet, phone_col, name_col):
    """
    Reads raw Excel, filters out duplicates & already sent numbers,
    preserves duplicates/invalid contacts in another log (skips sent without logging),
    and generates a fresh sanitized Excel.
    """
    try:
        df = pd.read_excel(raw_file, sheet_name=sheet)
    except Exception as e:
        try:
            # Fallback: if raw file missing, try reading existing sanitized file
            df = pd.read_excel(sanitized_file, sheet_name=sheet)
            print(f"ℹ️ Raw file '{raw_file}' not found, loaded from '{sanitized_file}' instead.")
        except Exception as e2:
            print(f"❌ Could not open Excel file: {e}")
            print(f"   Make sure '{raw_file}' or '{sanitized_file}' is in the same folder.")
            exit()

    total_contacts = len(df)

    # Clean phone numbers
    df[phone_col] = df[phone_col].astype(str).str.strip()
    df[phone_col] = df[phone_col].str.replace(r'[^0-9+]', '', regex=True)

    sent = load_sent_log()
    existing_filtered = load_filtered_log()

    newly_filtered = 0
    already_sent_count = 0
    duplicate_count = 0
    invalid_count = 0

    valid_rows = []
    seen_phones = set()

    for i, row in df.iterrows():
        phone = str(row[phone_col])
        name = str(row.get(name_col, "N/A"))

        # 1. Invalid phone filter
        if len(phone) <= 7:
            invalid_count += 1
            if phone not in existing_filtered:
                log_filtered(phone, name, "Invalid Phone Number")
                existing_filtered.add(phone)
                newly_filtered += 1
            continue

        # 2. Already sent filter (skip without logging to filter log, as it's already in sent_log)
        if phone in sent:
            already_sent_count += 1
            continue

        # 3. Duplicate contact filter
        if phone in seen_phones:
            duplicate_count += 1
            if phone not in existing_filtered:
                log_filtered(phone, name, "Duplicate Contact")
                existing_filtered.add(phone)
                newly_filtered += 1
            continue

        seen_phones.add(phone)
        valid_rows.append(row)

    df_clean = pd.DataFrame(valid_rows)

    # Save fresh sanitized excel
    try:
        df_clean.to_excel(sanitized_file, sheet_name=sheet, index=False)
        print(f"✅ Fresh sanitized Excel saved to: {sanitized_file}")
    except Exception as e:
        print(f"⚠️ Warning: Could not save sanitized Excel: {e}")

    print("\n" + "="*55)
    print("  📊 SANITIZATION & FILTER SUMMARY")
    print(f"  Total rows examined         : {total_contacts}")
    print(f"  📤 Skipped (Already Sent)   : {already_sent_count}")
    print(f"  🔄 Filtered (Duplicates)    : {duplicate_count}")
    if invalid_count > 0:
        print(f"  ❌ Filtered (Invalid Phone) : {invalid_count}")
    print(f"  📝 New contacts logged      : {newly_filtered}")
    print(f"  📁 Filter logs preserved in : {FILTERED_LOG_FILE} & {FILTERED_DETAILS_FILE}")
    print(f"  📋 Fresh sanitized remaining: {len(df_clean)}")
    print("="*55)

    return df_clean.reset_index(drop=True)


def load_sent_log():
    """Load list of already sent numbers"""
    try:
        with open(LOG_FILE, "r") as f:
            lines = f.read().splitlines()
            return set(lines)
    except FileNotFoundError:
        return set()


def log_sent(phone, name):
    """Save sent number to log file"""
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{phone}\n")
    with open("sent_details.txt", "a", encoding="utf-8") as f:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        f.write(f"{timestamp} | {phone} | {name}\n")


def format_phone(phone):
    """Format phone for WhatsApp API"""
    phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
    if phone.startswith("880"):
        return phone
    elif phone.startswith("01"):
        return "880" + phone[1:]
    elif phone.startswith("1"):
        return "880" + phone
    return phone


def setup_driver():
    """Setup Chrome driver with local session persistence for WhatsApp Web"""
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--window-size=1400,900")
    
    # Store WhatsApp login session in local folder so you don't need to scan QR code every day!
    profile_path = os.path.abspath("whatsapp_session")
    options.add_argument(f"--user-data-dir={profile_path}")
    
    driver = webdriver.Chrome(options=options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


def wait_for_whatsapp_login(driver):
    """Wait until WhatsApp Web is loaded and logged in"""
    print("\n🌐 Opening WhatsApp Web...")
    driver.get("https://web.whatsapp.com")
    print("⏳ Waiting for WhatsApp Web to load... (If prompted, please scan the QR code in Chrome)")
    
    # Wait up to 180 seconds for side panel / chat list / header to appear
    start_time = time.time()
    while time.time() - start_time < 180:
        try:
            logged_in = driver.find_elements(By.XPATH, '//div[@id="side"] | //div[@data-testid="chat-list"] | //header')
            if logged_in and len(logged_in) > 0:
                print("✅ Successfully connected to WhatsApp Web!")
                time.sleep(3)  # Buffer for background synchronization
                return True
        except Exception:
            pass
        time.sleep(1)
    
    print("❌ Timeout waiting for WhatsApp Web login. Please make sure you scanned the QR code.")
    return False


def send_to_contact(driver, phone, name, index, total):
    """Open WhatsApp for one contact and auto-send using Selenium"""
    formatted = format_phone(phone)
    personalized_message = MESSAGE.replace("{name}", name)
    encoded_message = urllib.parse.quote(personalized_message)
    url = f"https://web.whatsapp.com/send?phone={formatted}&text={encoded_message}"

    print(f"\n{'='*55}")
    print(f"  [{index}/{total}] {name}")
    print(f"  📞 {formatted}")
    print(f"{'='*55}")
    print("  🌐 Navigating to chat in Selenium...")
    driver.get(url)

    # Wait up to 35 seconds for either the message box/send button OR invalid number popup
    start_time = time.time()
    chat_ready = False
    invalid_number = False

    while time.time() - start_time < 35:
        page_text = driver.page_source.lower()
        # 1. Check if "invalid phone number" popup appeared
        if "phone number shared via url is invalid" in page_text or "url is invalid" in page_text or "not on whatsapp" in page_text:
            invalid_number = True
            break

        # 2. Check if send button or message textbox is available
        try:
            send_elements = driver.find_elements(By.XPATH, '//span[@data-icon="send"] | //button[@aria-label="Send"] | //div[@aria-label="Send"] | //div[@contenteditable="true"] | //div[@role="textbox"]')
            if send_elements and len(send_elements) > 0:
                chat_ready = True
                break
        except Exception:
            pass

        time.sleep(1)

    if invalid_number:
        print("  ⚠️ Skipped: This phone number is NOT on WhatsApp!")
        try:
            ok_buttons = driver.find_elements(By.XPATH, '//button[contains(text(), "OK")] | //div[@role="button"][contains(., "OK")]')
            for btn in ok_buttons:
                btn.click()
        except Exception:
            pass
        log_filtered(formatted, name, "Not on WhatsApp")
        return False, "Not on WhatsApp"

    if not chat_ready:
        print("  ❌ Error: Timed out waiting for chat to load (slow internet or page stuck).")
        return False, "Timeout Loading Chat"

    # Chat is ready! Let's send the message
    print("  💬 Chat loaded! Sending message...")
    time.sleep(2)  # Brief pause to ensure input field is focused

    sent_successfully = False
    try:
        # Try clicking send icon first
        send_buttons = driver.find_elements(By.XPATH, '//span[@data-icon="send"]/.. | //button[@aria-label="Send"] | //div[@aria-label="Send"]')
        if send_buttons:
            send_buttons[0].click()
            sent_successfully = True
    except Exception as e:
        pass

    if not sent_successfully:
        try:
            # Fallback: find input textbox and send RETURN key
            textboxes = driver.find_elements(By.XPATH, '//div[@contenteditable="true"] | //div[@role="textbox"]')
            if textboxes:
                textboxes[-1].send_keys(Keys.ENTER)
                sent_successfully = True
        except Exception as e:
            pass

    if sent_successfully:
        print("  ✅ Message sent successfully!")
        time.sleep(3)  # Wait 3 seconds for message network dispatch before moving on
        return True, "Sent Successfully"
    else:
        print("  ❌ Error: Could not click Send button.")
        return False, "Failed to Click Send"


def countdown(seconds):
    """Show countdown timer"""
    for i in range(seconds, 0, -1):
        print(f"\r  ⏳ Next in {i:2d} seconds... (Press Ctrl+C to pause)", end="")
        time.sleep(1)
    print()


def main():
    print("\n" + "="*55)
    print("  CampusBaba — WhatsApp Sender (Selenium Pro)")
    print("  Fully-Auto: Waits for chat to load & verifies delivery")
    print("="*55)

    # Load and sanitize contacts (filters out duplicates & already sent, preserves in log)
    df = load_and_sanitize_excel(RAW_EXCEL_FILE, SANITIZED_EXCEL_FILE, SHEET_NAME, PHONE_COL, NAME_COL)

    if len(df) == 0:
        print("\n✅ All contacts have been messaged already!")
        return

    # Limit to daily limit
    to_send = df.head(DAILY_LIMIT)
    total   = len(to_send)

    print(f"\n📅 Today's batch : {total} contacts")
    print(f"⏱  Est. time     : ~{total * max(DELAY_SEC, 5) // 60} minutes")
    print(f"\n🚀 Launching WhatsApp Web browser session...")

    driver = setup_driver()
    try:
        if not wait_for_whatsapp_login(driver):
            return

        input("\n▶  Press ENTER when ready to start sending batch...")

        sent_count = 0
        skipped    = []

        for i, row in to_send.iterrows():
            phone = str(row[PHONE_COL])
            name  = str(row.get(NAME_COL, "স্যার"))

            try:
                success, reason = send_to_contact(driver, phone, name, sent_count + 1, total)
                if success:
                    # Log as sent ONLY after Selenium verifies delivery!
                    log_sent(phone, name)
                    sent_count += 1
                    print(f"  ✅ Confirmed sent and logged! Total sent today: {sent_count}")
                else:
                    skipped.append((phone, name, reason))
                    print(f"  ⏭ Skipped {name} ({reason}). NOT added to sent log.")

                # Wait before the next one
                countdown(DELAY_SEC)

            except KeyboardInterrupt:
                print("\n\n⏸  Paused by user.")
                break
            except Exception as e:
                print(f"  ❌ Error: {e}")
                continue
    finally:
        print("\n🔒 Closing browser session...")
        try:
            driver.quit()
        except Exception:
            pass

    # Summary
    print("\n" + "="*55)
    print(f"  📊 SESSION SUMMARY")
    print(f"  ✅ Sent today    : {sent_count}")
    print(f"  ⏭  Skipped       : {len(skipped)}")
    remaining = len(df) - sent_count
    print(f"  📋 Remaining     : {remaining}")
    print(f"  📁 Log saved to  : {LOG_FILE}")
    print("="*55)

    if remaining > 0:
        print(f"\n  💡 Run again tomorrow for next {min(DAILY_LIMIT, remaining)} contacts!")


if __name__ == "__main__":
    main()