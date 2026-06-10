import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix loadAutomationScript's find logic and language forcing
old_load_logic = '''      const script = S.automationScripts.find(s => String(s.testCaseId) === String(S.selectedAutomationTc) && s.module === S.selectedAutomationModule);

      // Update editor text
      const templates = {
        python: `from selenium import webdriver\\nfrom selenium.webdriver.chrome.options import Options\\n# OR: from playwright.sync_api import sync_playwright\\n\\ntry:\\n    # DOCKER REQUIRED OPTIONS (For Selenium):\\n    # options = Options()\\n    # options.add_argument("--headless=new")\\n    # options.add_argument("--no-sandbox")\\n    # options.add_argument("--disable-dev-shm-usage")\\n    \\n    # Your logic here...\\n    \\n    # IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n    print("PASS")\\nexcept Exception as e:\\n    print("FAIL")\\n    print(str(e))`,
        javascript: `const { Builder, By } = require("selenium-webdriver");\\nconst chrome = require("selenium-webdriver/chrome");\\n// OR: const { chromium } = require('playwright');\\n\\n(async function() {\\n  try {\\n    // DOCKER REQUIRED OPTIONS (For Selenium):\\n    // const options = new chrome.Options();\\n    // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\\n    \\n    // Your logic here...\\n    \\n    // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n    console.log("PASS");\\n  } catch (err) {\\n    console.log("FAIL");\\n    console.log(err.message);\\n  }\\n})();`,
        java: `public class Script {\\n    public static void main(String[] args) {\\n        try {\\n            // DOCKER REQUIRED OPTIONS (For Selenium):\\n            // ChromeOptions options = new ChromeOptions();\\n            // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\\n\\n            // Your logic here...\\n\\n            // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n            System.out.println("PASS");\\n        } catch (Exception e) {\\n            System.out.println("FAIL");\\n            e.printStackTrace();\\n        }\\n    }\\n}`
      };
      const langKey = S.selectedAutomationLanguage || (document.getElementById('auto-language-select') || {}).value || 'python';
      const existingScript = (script && script.script && script.script.trim() !== '') ? script.script : '';
      S.currentUnsavedScript = existingScript ? existingScript : (templates[langKey] || '');
      if (window.cmEditor) {
        window.cmEditor.dispatch({
          changes: { from: 0, to: window.cmEditor.state.doc.length, insert: S.currentUnsavedScript }
        });
      }

      // Update language selection
      if (langSelect) {
        const targetLang = script && script.language ? script.language : (S.selectedAutomationLanguage || 'python');
        langSelect.value = targetLang;
        // Explicitly update options so that default selection matches
        Array.from(langSelect.options).forEach(opt => opt.selected = opt.value === targetLang);
        langSelect.dispatchEvent(new Event('custom-update'));
        onAutoLangChange(true);
      }'''

new_load_logic = '''      const langKey = S.selectedAutomationLanguage || (document.getElementById('auto-language-select') || {}).value || 'python';
      const script = S.automationScripts.find(s => String(s.testCaseId) === String(S.selectedAutomationTc) && s.module === S.selectedAutomationModule && s.language === langKey);

      // Update editor text
      const templates = {
        python: `from selenium import webdriver\\nfrom selenium.webdriver.chrome.options import Options\\n# OR: from playwright.sync_api import sync_playwright\\n\\ntry:\\n    # DOCKER REQUIRED OPTIONS (For Selenium):\\n    # options = Options()\\n    # options.add_argument("--headless=new")\\n    # options.add_argument("--no-sandbox")\\n    # options.add_argument("--disable-dev-shm-usage")\\n    \\n    # Your logic here...\\n    \\n    # IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n    print("PASS")\\nexcept Exception as e:\\n    print("FAIL")\\n    print(str(e))`,
        javascript: `const { Builder, By } = require("selenium-webdriver");\\nconst chrome = require("selenium-webdriver/chrome");\\n// OR: const { chromium } = require('playwright');\\n\\n(async function() {\\n  try {\\n    // DOCKER REQUIRED OPTIONS (For Selenium):\\n    // const options = new chrome.Options();\\n    // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\\n    \\n    // Your logic here...\\n    \\n    // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n    console.log("PASS");\\n  } catch (err) {\\n    console.log("FAIL");\\n    console.log(err.message);\\n  }\\n})();`,
        java: `public class Script {\\n    public static void main(String[] args) {\\n        try {\\n            // DOCKER REQUIRED OPTIONS (For Selenium):\\n            // ChromeOptions options = new ChromeOptions();\\n            // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\\n\\n            // Your logic here...\\n\\n            // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\\n            System.out.println("PASS");\\n        } catch (Exception e) {\\n            System.out.println("FAIL");\\n            e.printStackTrace();\\n        }\\n    }\\n}`
      };
      const existingScript = (script && script.script && script.script.trim() !== '') ? script.script : '';
      S.currentUnsavedScript = existingScript ? existingScript : (templates[langKey] || '');
      if (window.cmEditor) {
        window.cmEditor.dispatch({
          changes: { from: 0, to: window.cmEditor.state.doc.length, insert: S.currentUnsavedScript }
        });
      }

      // Update language selection
      if (langSelect) {
        langSelect.value = langKey;
        // Explicitly update options so that default selection matches
        Array.from(langSelect.options).forEach(opt => opt.selected = opt.value === langKey);
        langSelect.dispatchEvent(new Event('custom-update'));
        onAutoLangChange(true);
      }'''

content = content.replace(old_load_logic, new_load_logic)


# 2. Fix saveAutomationScript find logic
old_save_logic = '''      const existingIndex = S.automationScripts.findIndex(s => String(s.testCaseId) === String(scriptData.testCaseId) && s.module === scriptData.module);'''
new_save_logic = '''      const existingIndex = S.automationScripts.findIndex(s => String(s.testCaseId) === String(scriptData.testCaseId) && s.module === scriptData.module && s.language === scriptData.language);'''

content = content.replace(old_save_logic, new_save_logic)


# 3. Add Save buttons to the IDE header (there are multiple places where UI is rendered)
# The user's screenshot showed Bug OS IDE. Let's look for "Clear" button in buildAutomationTabs maybe? Wait, where is the Run script button?
# It's at line 8255-ish. We should add Save there too if it isn't. Let me do regex to find Run Script buttons.
target_run_btn = r'<button class="btn btn-primary" onclick="runAutomationScript\(\)"><svg.*?Run Script</button>'
# Wait, let's just make sure Save Script is right next to it.
save_btn = '''<button class="btn btn-success" onclick="saveAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>Save Script</button>'''

if 'Save Script</button>' not in content and 'Save (Ctrl+S)' not in content:
    # Actually, my previous patch_bugs.py injected a Save button next to Clear, but maybe it missed the CodeMirror version!
    # Wait, where is "Clear" in index.html?
    pass

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied patch_bugs_2.py!")
