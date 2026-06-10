const http = require('http');

const data = JSON.stringify({
  testCaseId: 'TC-1',
  module: 'NEW',
  language: 'python',
  script: `from playwright.sync_api import sync_playwright
import time
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="./")
    page = context.new_page()
    page.goto("https://practicetestautomation.com/practice-test-login/")
    time.sleep(2)
    context.close()
    browser.close()
print("PASS")`
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/run-automation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
