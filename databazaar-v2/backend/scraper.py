import time
import re
import os
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

SCROLL_TIMES = 10
WAIT_TIME = 2

SCREENSHOTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_results", "screenshots")
os.makedirs(SCREENSHOTS_FOLDER, exist_ok=True)

def save_scraper_screenshot(driver, job_id):
    """Save a screenshot of the current browser state for live map view"""
    if not job_id:
        return
    try:
        screenshot_path = os.path.join(SCREENSHOTS_FOLDER, f"job_{job_id}.png")
        driver.save_screenshot(screenshot_path)
    except Exception:
        pass



def setup_driver(headless=False):
    """Setup Chrome in visible or headless mode with Selenium"""
    options = Options()
    if headless:
        options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--window-size=1400,900")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def extract_phone(text):
    """Extract Bangladesh phone number from page source or elements"""
    patterns = [
        r'(\+880\s?1[3-9]\d{8})',
        r'(880\s?1[3-9]\d{8})',
        r'(01[3-9]\d{8})',
        r'(1[3-9]\d{8})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text.replace('-', '').replace(' ', ''))
        if match:
            num = match.group(1)
            if not num.startswith('+880') and not num.startswith('880'):
                num = '+880' + num
            return num
    return ''

def scroll_results(driver, scroll_times=10, log_cb=print):
    """Scroll Google Maps sidebar panel"""
    try:
        panel = driver.find_element(By.CSS_SELECTOR, 'div[role="feed"]')
        for i in range(scroll_times):
            driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", panel)
            time.sleep(1.5)
            log_cb(f"Scrolling maps sidebar feed... {i+1}/{scroll_times}")
    except Exception as e:
        log_cb(f"Sidebar scroll skipped: {e}")

def scrape_query(driver, query, log_cb=print, job_id=None):
    """Scrape a search query from Google Maps"""
    results = []
    log_cb(f"Starting Google Maps search query: '{query}'")

    url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    driver.get(url)
    time.sleep(3)
    save_scraper_screenshot(driver, job_id)

    # Scroll sidebar
    scroll_results(driver, SCROLL_TIMES, log_cb)
    time.sleep(2)
    save_scraper_screenshot(driver, job_id)



    listings = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/maps/place/"]')
    log_cb(f"Discovered {len(listings)} business elements on the page.")

    seen_names = set()

    for i, listing in enumerate(listings):
        try:
            name = listing.get_attribute("aria-label") or ""
            href = listing.get_attribute("href") or ""

            if not name or name in seen_names:
                continue
            seen_names.add(name)

            # Click to load details
            driver.execute_script("arguments[0].click();", listing)
            time.sleep(2)
            save_scraper_screenshot(driver, job_id)

            phone = ''
            address = ''
            website = ''
            rating = ''
            category = ''

            # Phone Extraction
            try:
                phone_els = driver.find_elements(
                    By.CSS_SELECTOR,
                    'button[data-item-id*="phone"], button[aria-label*="phone"], [data-tooltip*="Copy phone"]'
                )
                for el in phone_els:
                    text = el.get_attribute("aria-label") or el.text
                    phone = extract_phone(text)
                    if phone:
                        break
            except Exception:
                pass

            # Address Extraction
            try:
                addr_els = driver.find_elements(
                    By.CSS_SELECTOR, 'button[data-item-id*="address"], [data-tooltip*="Copy address"]'
                )
                for el in addr_els:
                    txt = el.get_attribute("aria-label") or el.text
                    if txt and len(txt) > 5:
                        address = txt.replace("Address: ", "").strip()
                        break
            except Exception:
                pass

            # Website Extraction
            try:
                web_els = driver.find_elements(By.CSS_SELECTOR, 'a[data-item-id*="authority"]')
                for el in web_els:
                    w = el.get_attribute("href") or ""
                    if w and "google" not in w:
                        website = w
                        break
            except Exception:
                pass

            # Rating
            try:
                rating_el = driver.find_element(By.CSS_SELECTOR, 'span[aria-label*="stars"]')
                rating = rating_el.get_attribute("aria-label") or ""
            except Exception:
                pass

            # Category
            try:
                cat_el = driver.find_element(By.CSS_SELECTOR, 'button[jsaction*="category"]')
                category = cat_el.text.strip()
            except Exception:
                pass

            entry = {
                "Name": name,
                "Phone": phone,
                "Address": address,
                "Website": website,
                "Rating": rating,
                "Category": category,
                "Maps URL": href,
                "Query": query,
            }
            results.append(entry)
            status_tag = "[OK]" if phone else "[NO PHONE]"
            log_cb(f"Scraped listing: {name[:30]} {status_tag} {phone}")
            if i % 2 == 0:
                save_scraper_screenshot(driver, job_id)



        except Exception as e:
            log_cb(f"Error extracting listing index {i+1}: {e}")
            continue

    return results

def save_to_excel(all_results, filename):
    """Save results to format-aligned Excel spreadsheet"""
    if not all_results:
        return
    df = pd.DataFrame(all_results)
    df = df.drop_duplicates(subset=["Name", "Phone"])

    # Sort with phone numbers first
    df["has_phone"] = df["Phone"].apply(lambda x: 0 if x else 1)
    df = df.sort_values(["has_phone", "Name"]).drop(columns=["has_phone"])

    with pd.ExcelWriter(filename, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Coaching Centers")
        ws = writer.sheets["Coaching Centers"]

        col_widths = {
            "A": 35, "B": 18, "C": 40, "D": 30, "E": 10, "F": 20, "G": 50, "H": 35
        }
        for col, width in col_widths.items():
            ws.column_dimensions[col].width = width

        from openpyxl.styles import PatternFill, Font, Alignment
        header_fill = PatternFill(start_color="0D1B3E", end_color="0D1B3E", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        green_fill = PatternFill(start_color="E1F5EE", end_color="E1F5EE", fill_type="solid")
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
            if row[1].value:  # has phone
                for cell in row:
                    cell.fill = green_fill
