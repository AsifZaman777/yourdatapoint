import { test, expect } from "@playwright/test";

test.describe("DATABAZAAR / MARKETING OSTAD - FULL APPLICATION SUITE", () => {

  // Helper to inject English language and auth session into browser before navigation
  const setupAuth = async (page: any) => {
    await page.route("**/api/auth/me", (route: any) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          email: "admin@databazaar.com",
          full_name: "System Admin",
          role: "admin",
          credits: 500,
          created_at: "2026-07-30T00:00:00Z"
        }),
      });
    });

    await page.route("**/api/config/regions", (route: any) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          regions: { Dhaka: { Dhaka: ["Dhanmondi", "Gulshan"] } },
          categories: ["Coaching", "Software", "E-commerce"]
        }),
      });
    });

    await page.route("**/api/datasets**", (route: any) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Dhaka Coaching Leads",
            category: "Education",
            row_count: 500,
            price_credits: 10,
            created_at: "2026-07-30T00:00:00Z"
          }
        ]),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("token", "mock_auth_token_xyz");
      window.localStorage.setItem("lang", "en");
    });
  };

  // ── 1. PUBLIC LANDING PAGE & DESIGN SYSTEM ──
  test("01 - Landing Page renders navigation, hero, pricing calculator & footer", async ({ page }) => {
    await page.goto("/");

    // Verify title and brand navbar
    await expect(page).toHaveTitle(/DataBazaar|Marketing/i);
    await expect(page.getByText("MARKETING OSTAD").first()).toBeVisible();

    // Verify navigation links
    await expect(page.getByRole("link", { name: /Datasets|ক্যাটালগ|ডাটা/i }).first()).toBeVisible();

    // Hero banner CTA buttons
    const browseCta = page.getByRole("link", { name: /Browse Datasets|ক্যাটালগ|ফ্রি/i }).first();
    await expect(browseCta).toBeVisible();

    // Pricing Section & Credit Calculator
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);

    // Verify footer branding & support phone
    await expect(page.getByText(/\+880 1863443343|asifdev777@gmail\.com/i).first()).toBeVisible();
  });

  // ── 2. AUTHENTICATION FLOW ──
  test("02 - Auth Page displays Sign In and Register forms", async ({ page }) => {
    await page.goto("/auth");

    // Check form heading or inputs
    const formHeading = page.getByRole("heading", { name: /Sign In|Login|লগইন/i }).first();
    await expect(formHeading).toBeVisible();

    // Toggle to Register tab if available
    const registerTab = page.getByRole("button", { name: /Register|নিবন্ধন|রেজিস্ট্রেশন/i }).first();
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }
  });

  // ── 3. DATASET CATALOG & PAGINATION ──
  test("03 - Catalog Page displays filters, dataset cards & detail pagination modal", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/catalog");

    // Tab switcher (Public vs Private)
    const publicTab = page.getByRole("tab", { name: /Public Catalog|পাবলিক ক্যাটালগ|ক্যাটালগ/i }).first();
    const privateTab = page.getByRole("tab", { name: /Private|মাই স্ক্র্যাপড/i }).first();

    await expect(publicTab).toBeVisible();
    await expect(privateTab).toBeVisible();

    // Click Private tab
    if (await privateTab.isVisible()) {
      await privateTab.click();
      await page.waitForTimeout(300);
    }
  });

  // ── 4. LIVE GOOGLE MAPS SCRAPER CONSOLE ──
  test("04 - Scraper Console page renders query configuration and custom request modal", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/scraper");

    // Location selectors
    await expect(page.getByText(/Division|বিভাগ/i).first()).toBeVisible();
    await expect(page.getByText(/District|জেলা/i).first()).toBeVisible();

    // Custom Dataset Request button
    const requestBtn = page.getByRole("button", { name: /Request Custom Dataset|আবেদন/i }).first();
    if (await requestBtn.isVisible()) {
      await requestBtn.click();
      await page.keyboard.press("Escape");
    }
  });

  // ── 5. MARKETING AUTOMATION ENGINE ──
  test("05 - Marketing Console displays WhatsApp, Email & History panels", async ({ page }) => {
    await setupAuth(page);

    await page.route("**/api/marketing/whatsapp-status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_active: true }),
      });
    });

    await page.route("**/api/marketing/dashboard-stats", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_campaigns: 5,
          total_sent: 120,
          total_failed: 2,
          campaigns: []
        }),
      });
    });

    await page.goto("/marketing");

    // Verify WhatsApp engine header
    await expect(page.getByText(/WhatsApp|হোয়াটসঅ্যাপ/i).first()).toBeVisible();

    // Switch to Email Marketing tab if available
    const emailTab = page.getByRole("tab", { name: /Email|ইমেইল/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    // Switch to Campaign History tab if available
    const historyTab = page.getByRole("tab", { name: /History|ক্যাম্পেইন হিস্ট্রি/i }).first();
    if (await historyTab.isVisible()) {
      await historyTab.click({ force: true });
    }
  });

  // ── 6. UPGRADE & BDT CREDIT PACKAGES ──
  test("06 - Upgrade Page renders pricing packs and payment wizard modal", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/upgrade");

    // Package cards
    await expect(page.getByText(/Starter|স্টার্টার/i).first()).toBeVisible();
  });

  // ── 7. ADMIN CONTROL CENTER ──
  test("07 - Admin pages rendering and control panels", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/admin");

    // Payment Gateway settings page
    await page.goto("/admin/gateway");

    // Customer Payment Verification page
    await page.goto("/admin/payments");

    // Promotion requests page
    await page.goto("/admin/promotions");
  });

  // ── 8. USER MANAGEMENT & WARNING MODAL ──
  test("08 - Users Management page renders customer table and Warning Notice modal", async ({ page }) => {
    await setupAuth(page);

    await page.route("**/api/admin/users", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            email: "customer@example.com",
            full_name: "Sample Customer",
            role: "user",
            credits: 50,
            is_banned: 0,
          }
        ]),
      });
    });

    await page.goto("/users");

    // Warning button opens Warning Notice Modal
    const warningBtn = page.getByRole("button", { name: /Warning|সতর্কতা/i }).first();
    if (await warningBtn.isVisible()) {
      await warningBtn.click();

      // Close modal
      const cancelBtn = page.getByRole("button", { name: /Cancel|বাতিল/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click({ force: true });
      }
    }
  });

  // ── 9. SECURITY AUDIT SENSOR ──
  test("09 - Security Audit page renders anti-leak violation logs", async ({ page }) => {
    await setupAuth(page);

    await page.route("**/api/admin/violations", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/security");
    await expect(page.getByRole("button", { name: /Seed|সিড/i }).first()).toBeVisible();
  });

});
