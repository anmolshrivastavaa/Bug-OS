const { Builder, By } = require("selenium-webdriver");
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

})();
