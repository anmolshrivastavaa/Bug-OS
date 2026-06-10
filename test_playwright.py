from playwright.sync_api import sync_playwright
import time
import os

print(f"Running in {os.getcwd()}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="./")
    page = context.new_page()
    
    page.goto("https://practicetestautomation.com/practice-test-login/")
    time.sleep(2)
        
    context.close()
    browser.close()

import glob
print("Files generated:", glob.glob("*.webm"))
