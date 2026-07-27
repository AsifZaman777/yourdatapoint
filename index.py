"""
CampusBaba — Coaching Center Scraper
Scrapes coaching centers from Google Maps for Mirpur, Dhaka
Saves results to Excel file
"""

import time
import re
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ── Config ──────────────────────────────────────────────
SEARCH_QUERIES = [
    "Coaching center Mirpur Dhaka",
    "Coaching center Mirpur 1 Dhaka",
    "Coaching center Mirpur 2 Dhaka",
    "Coaching center Mirpur 10 Dhaka",
    "Coaching center Mirpur 11 Dhaka",
    "School Mirpur Dhaka",
    "Private tutor batch Mirpur Dhaka",
]

OUTPUT_FILE = "coaching_centers_mirpur.xlsx"
SCROLL_TIMES = 15       # how many times to scroll the results list
WAIT_TIME    = 2        # seconds between actions
# ────────────────────────────────────────────────────────


def setup_driver():
    """Setup Chrome in headless mode"""
    options = Options()
    # Comment out headless if you want to see the browser
    # options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--window-size=1400,900")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(options=options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


def scroll_results(driver, scroll_times=15, log_cb=print):
    """Scroll the results panel to load more listings"""
    try:
        panel = driver.find_element(
            By.CSS_SELECTOR, 'div[role="feed"]'
        )
        for i in range(scroll_times):
            driver.execute_script(
                "arguments[0].scrollTop = arguments[0].scrollHeight", panel
            )
            time.sleep(1.5)
            log_cb(f"  Scrolling... {i+1}/{scroll_times}")
    except Exception as e:
        log_cb(f"  Scroll error: {e}")


def extract_phone(text):
    """Extract Bangladesh phone number from text"""
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


def scrape_query(driver, query, log_cb=print):
    """Scrape one search query from Google Maps"""
    results = []
    log_cb(f"[SEARCH] Searching: {query}")

    url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    driver.get(url)
    time.sleep(3)

    # Scroll to load all results
    scroll_results(driver, SCROLL_TIMES, log_cb)
    time.sleep(2)

    # Get all listing cards
    listings = driver.find_elements(
        By.CSS_SELECTOR, 'a[href*="/maps/place/"]'
    )
    log_cb(f"  Found {len(listings)} listings")

    seen_names = set()

    for i, listing in enumerate(listings):
        try:
            name = listing.get_attribute("aria-label") or ""
            href = listing.get_attribute("href") or ""

            if not name or name in seen_names:
                continue
            seen_names.add(name)

            # Click to open detail panel
            driver.execute_script("arguments[0].click();", listing)
            time.sleep(2)

            phone    = ''
            address  = ''
            website  = ''
            rating   = ''
            category = ''

            # ── Phone number ──
            try:
                phone_els = driver.find_elements(
                    By.CSS_SELECTOR,
                    'button[data-item-id*="phone"], '
                    'button[aria-label*="phone"], '
                    '[data-tooltip*="Copy phone"]'
                )
                for el in phone_els:
                    text = el.get_attribute("aria-label") or el.text
                    phone = extract_phone(text)
                    if phone:
                        break
            except Exception:
                pass

            # Fallback — search page source for phone
            if not phone:
                page_text = driver.find_element(By.TAG_NAME, 'body').text
                phone = extract_phone(page_text)

            # ── Address ──
            try:
                addr_els = driver.find_elements(
                    By.CSS_SELECTOR,
                    'button[data-item-id*="address"], '
                    '[data-tooltip*="Copy address"]'
                )
                for el in addr_els:
                    txt = el.get_attribute("aria-label") or el.text
                    if txt and len(txt) > 5:
                        address = txt.replace("Address: ", "").strip()
                        break
            except Exception:
                pass

            # ── Website ──
            try:
                web_els = driver.find_elements(
                    By.CSS_SELECTOR, 'a[data-item-id*="authority"]'
                )
                for el in web_els:
                    w = el.get_attribute("href") or ""
                    if w and "google" not in w:
                        website = w
                        break
            except Exception:
                pass

            # ── Rating ──
            try:
                rating_el = driver.find_element(
                    By.CSS_SELECTOR, 'span[aria-label*="stars"]'
                )
                rating = rating_el.get_attribute("aria-label") or ""
            except Exception:
                pass

            # ── Category ──
            try:
                cat_el = driver.find_element(
                    By.CSS_SELECTOR,
                    'button[jsaction*="category"]'
                )
                category = cat_el.text.strip()
            except Exception:
                pass

            entry = {
                "Name":     name,
                "Phone":    phone,
                "Address":  address,
                "Website":  website,
                "Rating":   rating,
                "Category": category,
                "Maps URL": href,
                "Query":    query,
            }

            results.append(entry)
            status = "[OK]" if phone else "[WARN] no phone"
            log_cb(f"  [{i+1}] {name[:40]:40s} {status} {phone}")

        except Exception as e:
            log_cb(f"  Error on listing {i+1}: {e}")
            continue

    return results


def save_to_excel(all_results, filename):
    """Save results to a formatted Excel file"""
    if not all_results:
        print("[ERROR] No results to save.")
        return

    df = pd.DataFrame(all_results)

    # Remove exact duplicates
    df = df.drop_duplicates(subset=["Name", "Phone"])

    # Sort — entries with phone numbers first
    df["has_phone"] = df["Phone"].apply(lambda x: 0 if x else 1)
    df = df.sort_values(["has_phone", "Name"]).drop(columns=["has_phone"])

    # Save to Excel with formatting
    with pd.ExcelWriter(filename, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Coaching Centers")

        ws = writer.sheets["Coaching Centers"]

        # Column widths
        col_widths = {
            "A": 35,   # Name
            "B": 18,   # Phone
            "C": 40,   # Address
            "D": 30,   # Website
            "E": 10,   # Rating
            "F": 20,   # Category
            "G": 50,   # Maps URL
            "H": 35,   # Query
        }
        for col, width in col_widths.items():
            ws.column_dimensions[col].width = width

        # Header style
        from openpyxl.styles import PatternFill, Font, Alignment
        header_fill = PatternFill(
            start_color="0D1B3E", end_color="0D1B3E", fill_type="solid"
        )
        header_font = Font(color="FFFFFF", bold=True)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        # Highlight rows with phone numbers
        green_fill = PatternFill(
            start_color="E1F5EE", end_color="E1F5EE", fill_type="solid"
        )
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
            if row[1].value:  # has phone
                for cell in row:
                    cell.fill = green_fill

    total       = len(df)
    with_phone  = len(df[df["Phone"] != ""])
    print(f"\n[OK] Saved {total} coaching centers to '{filename}'")
    print(f"   With phone number: {with_phone}")
    print(f"   Without phone:    {total - with_phone}")


def main():
    print("=" * 60)
    print("  CampusBaba — Coaching Center Scraper")
    print("  Target: Mirpur, Dhaka")
    print("=" * 60)

    driver = setup_driver()
    all_results = []

    try:
        for query in SEARCH_QUERIES:
            results = scrape_query(driver, query)
            all_results.extend(results)
            time.sleep(2)

    except KeyboardInterrupt:
        print("\n[WARN] Stopped by user.")

    finally:
        driver.quit()

    save_to_excel(all_results, OUTPUT_FILE)
    print(f"\n[DONE] Open '{OUTPUT_FILE}' to see all results!")
    print("=" * 60)


if __name__ == "__main__":
    main()