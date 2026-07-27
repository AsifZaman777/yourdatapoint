import os
import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
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
    p_str = str(phone).strip()
    if p_str.endswith(".0"):
        p_str = p_str[:-2]
    cleaned = "".join(filter(str.isdigit, p_str))
    if cleaned.startswith("88001"):
        cleaned = "8801" + cleaned[5:]
    elif cleaned.startswith("01"):
        cleaned = "88" + cleaned
    elif cleaned.startswith("1") and len(cleaned) == 10:
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

def type_text_safely(driver, element, text, wpm=40):
    """Calibrated Humanized typing simulator at exact WPM (default 40 WPM)"""
    sec_per_word = 60.0 / float(wpm)  # 40 WPM = 1.5 seconds per word
    lines = text.split("\n")
    for l_idx, line in enumerate(lines):
        if l_idx > 0:
            try:
                ActionChains(driver).key_down(Keys.SHIFT).send_keys(Keys.ENTER).key_up(Keys.SHIFT).perform()
            except Exception:
                pass
            time.sleep(random.uniform(0.8, 1.4))

        words = line.split(" ")
        for w_idx, word in enumerate(words):
            word_to_type = word + (" " if w_idx < len(words) - 1 else "")
            
            try:
                driver.execute_script(
                    """
                    var el = arguments[0];
                    var txt = arguments[1];
                    el.focus();
                    document.execCommand('insertText', false, txt);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    """,
                    element,
                    word_to_type
                )
            except Exception:
                bmp_word = "".join(c for c in word_to_type if ord(c) <= 0xFFFF)
                element.send_keys(bmp_word)

            # Calibrated word delay centered around 40 WPM (~1.5s per word)
            word_len = max(len(word), 1)
            word_delay = random.uniform(sec_per_word * 0.7, sec_per_word * 1.3) * (word_len / 5.0)
            word_delay = max(0.6, min(2.5, word_delay))
            time.sleep(word_delay)

            # Natural pause at punctuation & Bangla Dari (।)
            if word and word[-1] in ('.', ',', '!', '?', ':', '।'):
                time.sleep(random.uniform(0.5, 1.2))

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
            textbox = None

            textbox_selectors = [
                '//footer//div[@contenteditable="true"]',
                '//footer//div[@role="textbox"]',
                '//div[@data-tab="10"]',
                '//div[contains(@aria-placeholder, "Type a message")]',
                '//footer//p',
                '//div[@contenteditable="true"]'
            ]

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
                    for sel in textbox_selectors:
                        inputs = driver.find_elements(By.XPATH, sel)
                        if inputs and len(inputs) > 0:
                            textbox = inputs[-1]
                            chat_ready = True
                            break
                    if chat_ready:
                        break
                except Exception:
                    pass
                time.sleep(1)

            if invalid_num:
                log_status(f"⚠️ Skipped {name}: Mobile number is not on WhatsApp.")
                update_failed()
                conn = get_db()
                conn.execute("INSERT OR REPLACE INTO whatsapp_progress (recipient_group, last_index, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (recipient_group, current_index + 1))
                conn.execute("UPDATE marketing_campaigns SET sent_count = ? WHERE id = ?", (campaign_id, current_index + 1))
                conn.commit()
                conn.close()
                continue

            if not chat_ready or not textbox:
                log_status(f"⚠️ Failed to load chat element for {name}. Skipping...")
                update_failed()
                continue

            try:
                # Focus textbox
                try:
                    driver.execute_script("arguments[0].focus();", textbox)
                except Exception:
                    pass
                textbox.click()
                time.sleep(0.5)

                log_status(f"Typing message to {name}...")
                type_text_safely(driver, textbox, personalized_msg)
                time.sleep(1.2)
                
                # Try clicking WhatsApp Send icon button first
                send_clicked = False
                try:
                    send_btn = driver.find_element(By.XPATH, '//button[@data-tab="11"] | //button[span[@data-icon="send"]] | //span[@data-icon="send"]/parent::button | //button[contains(@aria-label, "Send")]')
                    send_btn.click()
                    send_clicked = True
                except Exception:
                    pass

                if not send_clicked:
                    textbox.send_keys(Keys.ENTER)

                time.sleep(1.5)

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

