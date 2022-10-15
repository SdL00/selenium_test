/*jshint node:true */
'use strict';

const webdriver = require('selenium-webdriver'); // By = webdriver.By, until = webdriver.until,Builder= webdriver.Builder;
var chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

const sleep = module.exports.sleep = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  })
}

(async function example() {
  var chromeOptions = new chrome.Options()
    .addArguments('--allow-file-access-from-files')
    .addArguments('--use-fake-device-for-media-stream')
    .addArguments('--use-file-for-fake-video-capture=newfile.mjpeg')
    .addArguments('--use-fake-ui-for-media-stream') // option that allows to skip permissions
    .addArguments('--headless=chrome')
    .addArguments('--ignore-certificate-errors')
    .addArguments('--allow-running-insecure-content')
    .addArguments('--incognito')
    .addArguments('--no-sandbox')
    .addArguments('--disable-browser-side-navigation')
    .addArguments('--disable-application-cache')
    .addArguments('--disk-cache-size=1')
    .addArguments('--media-cache-size=1')
    .addArguments('--disable-infobars')
    .addArguments('--disable-popup-blocking')
    .addArguments('--disable-web-security')
    .addArguments('--disable-dev-shm-usage')
    .addArguments('--disable-background-timer-throttling')
    .addArguments('--disable-notifications')
    .addArguments('--log-level=3')
    .addArguments('--allow-running-insecure-content')
    .addArguments('--permissions.default.microphone')
    .addArguments('--permissions.default.camera')
    .addArguments('--enable-precise-memory-info')
    .addArguments('--ignore-gpu-blacklist')
    .addArguments('--no-user-gesture-required')
    .addArguments('--autoplay-policy=no-user-gesture-required')
    .addArguments('--disable-gpu')
    .setUserPreferences({
    "download.prompt_for_download": false,
    "profile.default_content_setting_values.automatic_downloads": 1,
    "profile.default_content_settings.popups": 0,
    "safebrowsing.enabled": false,
    "safebrowsing.disable_download_protection": true,
    "browser.set_download_behavior": "allow",
    "download.default_directory": "/home/stefano/Downloads/saveHere",
    "download.directory_upgrade": true});

  var driver = new webdriver.Builder()
    .forBrowser('chrome')
    // .withCapabilities(webdriver.Capabilities.chrome())
    .setChromeOptions(chromeOptions);


  driver = driver.build();

  try {
    await driver.get('https://10.73.0.104:3000/?info=true&roomId=65xcgdqr&produce=false&isBot=true'); // roomId to update
    console.log("Headless Chrome Initialized")
    await sleep(3);
    await driver.takeScreenshot().then(
      function (image) {
        fs.writeFileSync('screenshot.png', image, 'base64');
      }
    );

    await sleep(30);

  } catch (error) {
    console.log(error);
  } finally {
    await driver.quit();
  }

})();