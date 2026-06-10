const http = require('http');

const data = JSON.stringify({
  testCaseId: 'TC-1',
  module: 'NEW',
  language: 'javascript',
  script: `const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async function () {

    let driver;

    try {

        const options = new chrome.Options();
        options.addArguments("--headless=new");

        driver = await new Builder()
            .forBrowser("chrome")
            .setChromeOptions(options)
            .build();

        await driver.get(
            "https://practicetestautomation.com/practice-test-login/"
        );

        await driver.findElement(
            By.xpath("//input[@id='username']")
        ).sendKeys("student");

        await driver.findElement(
            By.xpath("//input[@id='password']")
        ).sendKeys("Password123");

        await driver.findElement(
            By.xpath("//button[@id='submit']")
        ).click();

        await driver.sleep(2000);

        const currentUrl = await driver.getCurrentUrl();

        const pageSource = await driver.getPageSource();

        if (
            currentUrl.toLowerCase().includes(
                "logged-in-successfully"
            ) &&
            pageSource.includes(
                "Logged In Successfully"
            )
        ) {
            console.log("PASS");
        } else {
            console.log("FAIL");
        }

    } catch (err) {

        console.log("FAIL");
        console.log(err.message);

    } finally {

        if (driver) {
            await driver.quit();
        }

    }

})();`
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/run-automation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error('Error:', error));
req.write(data);
req.end();
