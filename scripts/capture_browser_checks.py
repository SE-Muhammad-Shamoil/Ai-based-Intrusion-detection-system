"""Automated browser check script using Playwright and Firefox.

Interacts with the live UI to capture screenshots required by section 10:
- empty state
- results with drawer open
- performance tabs
- mobile width (360px)
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = Path("/home/shamoil/.gemini/antigravity/brain/0383e9cd-6a9f-40e8-83df-b7998a66751a")
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def run_checks():
    print("[*] Starting Playwright with Firefox...")
    with sync_playwright() as p:
        browser = p.firefox.launch(
            executable_path="/usr/bin/firefox",
            headless=True,
            firefox_user_prefs={
                "browser.tabs.remote.autostart": False,
            },
        )
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        print("[*] Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)

        # 1. Empty state screenshot
        print("[*] Capturing 01_empty_state.png...")
        page.screenshot(path=str(ARTIFACT_DIR / "01_empty_state.png"), full_page=False)

        # 2. Click 'Try sample flows'
        print("[*] Clicking 'Try sample flows' button...")
        sample_btn = page.locator("button:has-text('Try sample flows')").first
        sample_btn.click()

        # Wait for table to populate
        print("[*] Waiting for predictions to load...")
        page.wait_for_selector("table tbody tr", timeout=15000)
        time.sleep(2)

        # 3. Full results overview screenshot
        print("[*] Capturing 02_results_overview.png...")
        page.screenshot(path=str(ARTIFACT_DIR / "02_results_overview.png"), full_page=False)

        # 4. Click row #0 to open Detail Drawer
        print("[*] Clicking Row #0 to open detail drawer...")
        first_row = page.locator("table tbody tr").first
        first_row.click()

        page.wait_for_selector("#drawer-title", timeout=5000)
        time.sleep(1)

        # Click Explain with AI
        print("[*] Clicking 'Explain with AI' in drawer...")
        explain_btn = page.locator("button:has-text('Explain with AI')")
        if explain_btn.is_visible():
            explain_btn.click()
            # Wait for explanation card to render
            page.wait_for_selector("text=AI Summary of Model Evidence", timeout=10000)
            time.sleep(1)

        print("[*] Capturing 03_drawer_open.png...")
        page.screenshot(path=str(ARTIFACT_DIR / "03_drawer_open.png"), full_page=False)

        # Close drawer
        close_btn = page.locator("button[aria-label='Close drawer']")
        if close_btn.is_visible():
            close_btn.click()
            time.sleep(0.5)

        # 5. Scroll to Model Performance section
        print("[*] Scrolling to performance benchmarks...")
        perf_section = page.locator("#performance-section")
        perf_section.scroll_into_view_if_needed()
        time.sleep(1)
        page.screenshot(path=str(ARTIFACT_DIR / "04_performance_binary.png"), full_page=False)

        # Switch to Multiclass tab
        print("[*] Switching to Multiclass XGBoost tab...")
        multi_tab = page.locator("button:has-text('Multiclass XGBoost')")
        multi_tab.click()
        time.sleep(1)
        page.screenshot(path=str(ARTIFACT_DIR / "05_performance_multiclass.png"), full_page=False)

        # 6. Mobile Viewport (360px wide)
        print("[*] Switching to mobile viewport (360x780)...")
        page.set_viewport_size({"width": 360, "height": 780})
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)

        # Click sample flows on mobile
        sample_mobile = page.locator("button:has-text('Try sample flows')").first
        if sample_mobile.is_visible():
            sample_mobile.click()
            page.wait_for_selector("table", timeout=10000)
            time.sleep(1.5)

        print("[*] Capturing 06_mobile_view.png...")
        page.screenshot(path=str(ARTIFACT_DIR / "06_mobile_view.png"), full_page=False)

        browser.close()
        print("[✓] All browser check screenshots successfully captured!")


if __name__ == "__main__":
    run_checks()
