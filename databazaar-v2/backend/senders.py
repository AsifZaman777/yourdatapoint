import os
import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from datetime import datetime
from database import get_db

# Log files directory
LOGS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOGS_FOLDER, exist_ok=True)

# Screenshot directory for live map view
SCREENSHOTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_results", "screenshots")
os.makedirs(SCREENSHOTS_FOLDER, exist_ok=True)

def write_log_to_file(campaign_id, campaign_type, message):
    """Write campaign log entry to day-wise log file"""
    today = datetime.now().strftime("%Y-%m-%d")
    log_filename = f"{today}_campaigns.log"
    log_path = os.path.join(LOGS_FOLDER, log_filename)
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_line = f"[{timestamp}] [{campaign_id}] [{campaign_type.upper()}] {message}\n"
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception as e:
        print(f"Log file write error: {e}")

def format_phone(phone):
    """Clean and format phone number for WhatsApp URL API"""
    cleaned = "".join(filter(str.isdigit, str(phone)))
    if cleaned.startswith("0"):
        cleaned = "88" + cleaned
    elif cleaned.startswith("1"):
        cleaned = "880" + cleaned
    return cleaned

def setup_driver():
    """Setup Chrome options and persistence profile directory"""
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--window-size=1400,900")

    profile_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_session")
    options.add_argument(f"--user-data-dir={profile_path}")

    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def wait_for_whatsapp_login(driver):
    """Wait for scan session verification"""
    driver.get("https://web.whatsapp.com")
    start_time = time.time()
    while time.time() - start_time < 180:
        try:
            indicators = driver.find_elements(By.XPATH, '//div[@id="side"] | //div[@data-testid="chat-list"] | //header')
            if indicators and len(indicators) > 0:
                time.sleep(3)
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

def save_campaign_screenshot(driver, campaign_id):
    """Save a screenshot of the current browser state for live view"""
    try:
        screenshot_path = os.path.join(SCREENSHOTS_FOLDER, f"campaign_{campaign_id}.png")
        driver.save_screenshot(screenshot_path)
    except Exception:
        pass

def run_whatsapp_campaign(campaign_id, contacts, template_text, recipient_group, start_index=0):
    """Core WhatsApp human-emulating thread dispatch manager"""
    
    failed_count = 0

    def log_status(msg):
        try:
            conn = get_db()
            conn.execute("INSERT INTO campaign_logs (campaign_id, message) VALUES (?, ?)", (campaign_id, msg))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Log trace write error: {e}")
        # Also write to day-wise log file
        write_log_to_file(campaign_id, "whatsapp", msg)

    def update_failed():
        nonlocal failed_count
        failed_count += 1
        try:
            conn = get_db()
            conn.execute("UPDATE marketing_campaigns SET failed_count = ? WHERE id = ?", (failed_count, campaign_id))
            conn.commit()
            conn.close()
        except Exception:
            pass

    log_status(f"Campaign started. Preparing Selenium WhatsApp session...")
    log_status(f"Starting from contact index: {start_index} | Total contacts: {len(contacts)}")

    driver = None
    try:
        driver = setup_driver()
        if not wait_for_whatsapp_login(driver):
            log_status("WhatsApp Web login verification timed out or aborted.")
            conn = get_db()
            conn.execute("UPDATE marketing_campaigns SET status = 'failed' WHERE id = ?", (campaign_id,))
            conn.commit()
            conn.close()
            driver.quit()
            return

        log_status("Successfully logged in! Commencing lead group dispatch...")

        target_contacts = contacts[start_index:]
        for idx, contact in enumerate(target_contacts):
            current_index = start_index + idx

            # Check if campaign stopped
            conn = get_db()
            row = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
            conn.close()
            if row and row["status"] == "stopping":
                log_status(f"Campaign stopped by user. Paused at lead index: {current_index}.")
                conn = get_db()
                conn.execute("UPDATE marketing_campaigns SET status = 'stopped' WHERE id = ?", (campaign_id,))
                conn.commit()
                conn.close()
                driver.quit()
                return

            phone = contact["phone"]
            name = contact["name"]
            formatted = format_phone(phone)
            personalized_msg = template_text.replace("{name}", name)

            # Cool down delay logic (Every 8 messages, sleep 2 min)
            if idx > 0 and idx % 8 == 0:
                log_status("Entering 2-minute cooldown to prevent accounts bans...")
                for _ in range(24):
                    conn = get_db()
                    chk = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
                    conn.close()
                    if chk and chk["status"] == "stopping":
                        log_status(f"Campaign stopped during cooldown. Paused at lead index: {current_index}.")
                        conn = get_db()
                        conn.execute("UPDATE marketing_campaigns SET status = 'stopped' WHERE id = ?", (campaign_id,))
                        conn.commit()
                        conn.close()
                        driver.quit()
                        return
                    time.sleep(5)

            log_status(f"[{current_index + 1}/{len(contacts)}] Opening chat for {name} ({formatted})...")
            url = f"https://web.whatsapp.com/send?phone={formatted}"
            driver.get(url)

            # Save screenshot for live map view
            time.sleep(2)
            save_campaign_screenshot(driver, campaign_id)

            # Wait for text input panel
            start_load = time.time()
            chat_ready = False
            invalid_num = False
            while time.time() - start_load < 35:
                # Early stop check during page load
                conn = get_db()
                chk = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
                conn.close()
                if chk and chk["status"] == "stopping":
                    log_status(f"Campaign stopped. Paused at lead index: {current_index}.")
                    conn = get_db()
                    conn.execute("UPDATE marketing_campaigns SET status = 'stopped' WHERE id = ?", (campaign_id,))
                    conn.commit()
                    conn.close()
                    driver.quit()
                    return

                page_text = driver.page_source.lower()
                if "phone number shared via url is invalid" in page_text or "not on whatsapp" in page_text:
                    invalid_num = True
                    break
                try:
                    inputs = driver.find_elements(By.XPATH, '//div[@contenteditable="true"] | //div[@role="textbox"]')
                    if inputs and len(inputs) > 0:
                        chat_ready = True
                        break
                except Exception:
                    pass
                time.sleep(1)

            if invalid_num:
                log_status(f"⚠️ Skipped {name}: Mobile number is not on WhatsApp.")
                update_failed()
                conn = get_db()
                conn.execute("INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (recipient_group, current_index + 1))
                conn.execute("UPDATE marketing_campaigns SET sent_count = ? WHERE id = ?", (current_index + 1, campaign_id))
                conn.commit()
                conn.close()
                continue

            if not chat_ready:
                log_status(f"⚠️ Failed to load chat element for {name}. Skipping...")
                update_failed()
                continue

            try:
                textbox = driver.find_elements(By.XPATH, '//div[@contenteditable="true"] | //div[@role="textbox"]')[-1]
                textbox.click()
                time.sleep(1)

                log_status(f"Typing message to {name}...")
                words = personalized_msg.split(" ")
                for w in words:
                    conn = get_db()
                    chk = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
                    conn.close()
                    if chk and chk["status"] == "stopping":
                        log_status(f"Campaign stopped during typing. Paused at lead index: {current_index}.")
                        conn = get_db()
                        conn.execute("UPDATE marketing_campaigns SET status = 'stopped' WHERE id = ?", (campaign_id,))
                        conn.commit()
                        conn.close()
                        driver.quit()
                        return
                    textbox.send_keys(w + " ")
                    time.sleep(random.uniform(0.05, 0.2))

                time.sleep(random.uniform(1.0, 2.5))
                textbox.send_keys(Keys.ENTER)

                # Save screenshot after sending
                save_campaign_screenshot(driver, campaign_id)

                # Update SQLite database progress
                conn = get_db()
                conn.execute("INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (recipient_group, current_index + 1))
                conn.execute("UPDATE marketing_campaigns SET sent_count = ? WHERE id = ?", (current_index + 1, campaign_id))
                conn.commit()
                conn.close()

                log_status(f"✅ Message dispatched to {name} successfully! [{current_index + 1}/{len(contacts)}]")

                # Settle down delay
                delay = random.randint(10, 25)
                for _ in range(delay // 2):
                    conn = get_db()
                    chk = conn.execute("SELECT status FROM marketing_campaigns WHERE id = ?", (campaign_id,)).fetchone()
                    conn.close()
                    if chk and chk["status"] == "stopping":
                        log_status(f"Campaign stopped. Paused at lead index: {current_index + 1}.")
                        conn = get_db()
                        conn.execute("UPDATE marketing_campaigns SET status = 'stopped' WHERE id = ?", (campaign_id,))
                        conn.commit()
                        conn.close()
                        driver.quit()
                        return
                    time.sleep(2)

            except Exception as ex:
                log_status(f"❌ Typing process failed for {name}: {ex}")
                update_failed()

        driver.quit()
        log_status(f"🎉 WhatsApp campaign completed! Sent: {len(contacts) - failed_count}, Failed: {failed_count}")
        conn = get_db()
        conn.execute("UPDATE marketing_campaigns SET status = 'done' WHERE id = ?", (campaign_id,))
        conn.commit()
        conn.close()

    except Exception as ex:
        log_status(f"Fatal Dispatcher Thread Exception: {ex}")
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
        try:
            conn = get_db()
            conn.execute("UPDATE marketing_campaigns SET status = 'failed' WHERE id = ?", (campaign_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

