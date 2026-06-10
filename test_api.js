const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const baseTempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(baseTempDir)) {
  fs.mkdirSync(baseTempDir);
}
const execId = Date.now() + '_' + Math.floor(Math.random() * 1000);
const tempDir = path.join(baseTempDir, `exec_${execId}`);
fs.mkdirSync(tempDir);

const publicVideosDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(publicVideosDir)) {
  fs.mkdirSync(publicVideosDir, { recursive: true });
}

const pyScript = `
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

print("PASS")
`;

const pyFile = path.join(tempDir, `script.py`);
fs.writeFileSync(pyFile, pyScript);

console.log("Running Python script in:", tempDir);

exec(`python "${pyFile}"`, { cwd: tempDir, timeout: 120000 }, (runErr, runStdout, runStderr) => {
  let videoUrl = null;
  console.log("Stdout:", runStdout);
  console.log("Stderr:", runStderr);
  try {
    const files = fs.readdirSync(tempDir);
    console.log("Files found in tempDir:", files);
    for (const file of files) {
      if (file.endsWith('.webm') || file.endsWith('.mp4')) {
        const newFilename = `video_${execId}_${file}`;
        fs.renameSync(path.join(tempDir, file), path.join(publicVideosDir, newFilename));
        videoUrl = `/videos/${newFilename}`;
        console.log("Harvested video:", videoUrl);
        break;
      }
    }
  } catch (e) {
    console.error("Error harvesting video:", e);
  }

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Error cleaning up temp dir:", e);
  }

  console.log("Final video URL:", videoUrl);
});
