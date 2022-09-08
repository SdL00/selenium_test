/*jshint node:true */
'use strict';

const webdriver = require('selenium-webdriver'); // By = webdriver.By, until = webdriver.until,Builder= webdriver.Builder;
var chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const Blob = require('buffer');
const Readable = require ('stream');

const sleep = module.exports.sleep = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  })
}

(async function example(){
  var chromeOptions = new chrome.Options()
  .addArguments('allow-file-access-from-files')
  .addArguments('use-fake-device-for-media-stream')
  .addArguments('use-fake-ui-for-media-stream') // option that allows to skip permissions
  .addArguments('--headless')
  .addArguments('--ignore-certificate-errors')
  .addArguments('--allow-running-insecure-content')
  // .addArguments('--disable-gpu');
  
  var driver = new webdriver.Builder()
  .forBrowser('chrome')
  .setChromeOptions(chromeOptions);

  driver = driver.build();
    
  try {
    await driver.get('https://10.73.0.104:3000/?info=true&roomId=4runmc5l&produce=false');
    console.log("Headless Chrome Initialized")
    
    await driver.takeScreenshot().then(
      function(image) {
        fs.writeFileSync('screenshot.png', image, 'base64');
      }
    );
    
    // const video = await driver.wait(webdriver.until.elementsLocated(webdriver.By.css('video')), 9000);

    // const mediaRecorder = new window.MediaRecorder(video);

    // mediaRecorder.ondataavailable = handleDataAvailable;
    // mediaRecorder.start();

    // function handleDataAvailable(event) {
    //   console.log("data-available");
    //   if (event.data.size > 0) {
    //     recordedChunks.push(event.data);
    //     console.log(recordedChunks);
    //     download();
    //   } else {
    //     // …
    //   }
    // }
    // function download() {
    //   const blob = new Blob(recordedChunks, {
    //     type: "video/webm"
    //   });
    //   const url = URL.createObjectURL(blob);
    //   const a = document.createElement("a");
    //   document.body.appendChild(a);
    //   a.style = "display: none";
    //   a.href = url;
    //   a.download = "test.webm";
    //   a.click();
    //   window.URL.revokeObjectURL(url);
    // }

    // // demo: to download after 9sec
    // setTimeout((event) => {
    //   console.log("stopping");
    //   mediaRecorder.stop();
    // }, 9000);


    await sleep(60);

  } finally {
    await driver.quit();
  }
})();