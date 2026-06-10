from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time

try:
    options = Options()
    options.add_argument("--headless=new")

    driver = webdriver.Chrome(options=options)

    driver.get("https://practicetestautomation.com/practice-test-login/")

    username = driver.find_element(By.XPATH, "//input[@id='username']")
    password = driver.find_element(By.XPATH, "//input[@id='password']")
    submit = driver.find_element(By.XPATH, "//button[@id='submit']")

    assert username is not None
    assert password is not None
    assert submit is not None

    username.send_keys("student")
    password.send_keys("Password123")
    submit.click()

    time.sleep(2)

    current_url = driver.current_url

    if (
        "logged-in-successfully" in current_url.lower()
        and "Logged In Successfully" in driver.page_source
    ):
        print("PASS")
    else:
        print("FAIL")

    driver.quit()

except Exception as e:
    print("FAIL")
    print(str(e))
