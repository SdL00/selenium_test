/* eslint no-cond-assign:0, no-console:0 */
'use strict';

const log = require('debug-level')('app:rtc-client');
const EventEmitter = require('events');;
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');


// chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

/**
 * Class simulating RTC client session.
 * @class RtcClient
 */
module.exports = class RtcClient extends EventEmitter{

  /**
   * Create a client.
   * @param {string} url - the url to connect the browser tab.
   * @param {string} id  - the session id.
   */
  constructor({ url, id, width, height, headless }){
    super();
    log.debug('constructor', { url, id });

    if(!url){
      throw new Error('url is required');
    }
    this.url = url;
    this.id = id;
    this.width = width || 1280;
    this.height = height || 720;
    this.headless = headless;
    if (!process.env.DISPLAY) {
      log.warn('DISPLAY not set, running in headless mode');
      this.headless = true;
    }
    //this.tabsPerSession = tabsPerSession;
    this.driver = null;
  }

  /**
   * Set Browser capabilities, build driver and get url. 
   */
  async openBrowser(){
    log.debug('open Chrome Browser');
    // set chrome options
    const options = new chrome.Options();    
    options.setChromeBinaryPath(`/usr/bin/chromedriver`);
 
    [ `--app-data=${this.id}`]
    .concat(this.headless ? [
      '--headless',
    ] : [])
    .concat([
    //   //'--disable-gpu',
    //   //'--kiosk',
      '--incognito',
      '--no-sandbox',
    //   //'--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--no-user-gesture-required',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${this.width},${this.height}`,
      '--disable-application-cache',
      '--disk-cache-size=1',
      '--media-cache-size=1',
      '--disable-infobars',
      '--log-level=3',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--permissions.default.microphone',
      '--permissions.default.camera',
      '--enable-precise-memory-info',
      '--ignore-gpu-blacklist',
    //   '--use-file-for-fake-video-capture=/tmp/video.y4m',
    //   '--use-file-for-fake-audio-capture=/tmp/audio.wav',
    ]).forEach(o => options.addArguments(o));
    
    const prefs = new webdriver.logging.Preferences();
    prefs.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.DEBUG);
    const caps = webdriver.Capabilities.chrome();
    caps.setLoggingPrefs(prefs);
    try {
      // this.driver = new webdriver.Builder()
      //   .forBrowser('chrome')
      //   // .withCapabilities(caps)
      //   .setChromeOptions(options)
      //   .build();
      this.driver = await new webdriver.Builder().forBrowser('chrome').setChromeOptions(options).build();  
      await this.getUrl(this.url);
      log.info('Get url: %s', this.url);     
    } catch(err) {
      log.error('start error:', err);
      this.stop();
      throw err;
    }
  }

  /**
   * Get url.
   * @param {string} url - url to get
   */
  async getUrl(url){
    await this.driver.get(url);
  }

  /**
   * Open new tab.
   * @param {string} [url=undefined] - url to get
   */
  async newTab(url=undefined){
    log.debug('Open new tab')
    await this.driver.executeScript('window.open()');
    this.tabs = await this.driver.getAllWindowHandles();
    await this.switchTab(this.tabs.length - 1);
    if(url){
      await this.getUrl(url);
      log.debug('Get ', url);
    }  
  }

  /**
   * Switch tab.
   * @param {number} num - number of tab to switch into
   */
  async switchTab(num){
    try{
      await this.driver.switchTo().window(this.tabs[num]);
    } catch(e) {
      log.error(e);
    }
  }

  /**
   * Get page title.
   */
  async getTitle(){
    try{
      return await this.driver.getTitle();
    } catch(e) {
      log.error(e);
    }
    
  }

  /**
   * Get current url.
   */
  async getCurrentUrl(){
    try{
      return await this.driver.getCurrentUrl();
    } catch(e) {
      log.error(e);
    }
    
  }

  /**
   * Get WebElement by selector.
   * @param {string} css - element selector.
   * @param {number} [timeout = 300] - How long to wait for the condition to be true. [ms]
   * @return {WebElementPromise} A promise that will be resolved with the first truthy value returned by the condition function, or rejected if the condition times out.
   */
  async getElement(css, timeout = 300){
    try{
      return await this.driver.wait(webdriver.until.elementLocated(webdriver.By.css(css)), timeout);
    } catch(e) {
      log.error(e);
      log.error('Selenium unable to find selector: "%s"', css);
    }
  }

  /**
   * Get WebElement and click.
   * @param {string} css - element selector.
   * @param {number} [timeout = 300] - How long to wait for the condition to be true. [ms] 
   */
  async clickElement(css, timeout = 300){
    try{
      return await this.driver.wait(webdriver.until.elementLocated(webdriver.By.css(css)), timeout).click();
    } catch(e) {
      log.error(e);
      log.error('Selenium unable to click selector: "%s"', css);
    }
  }

  /**
   * Get multiple WebElements.
   * @param {string} css - element selector.
   * @return {Promise<Array<WebElement>>} A promise that will resolve to an array of WebElements.
   */
  async getElements(css){
    try{
      return await this.driver.findElements(webdriver.By.css(css));
    } catch(e) {
      log.error(e);
      log.error('Selenium unable to find multiple elements in: "%s"', css);
    }
  }

  /**
   * Get the first descendant of the given WebElement.
   * @param {WebElement} elemParent 
   * @param {string} elemChildCss 
   * @return {Promise<Array<WebElement>>} A promise that will resolve to a WebElements.
   */
  async getElementInElement(elemParent, elemChildCss){
    try{
      return await elemParent.findElement(webdriver.By.css(elemChildCss));
    } catch(e) {
      log.error(e);
      log.error('Selenium unable to find element "%s" in parent "%s"', elemChildCss, elemParent);
    }
  }

  /**
   * Get all of the descendants of the given WebElement.
   * @param {WebElement} elemParent 
   * @param {string} elemChildCss 
   * @return {Promise<Array<WebElement>>} A promise that will resolve to an array of WebElements.
   */
  async getElementsInElement(elemParent, elemChildCss){
    try{
      return await elemParent.findElements(webdriver.By.css(elemChildCss));
    } catch(e) {
      log.error(e);
      log.error('Selenium unable to find multiple elements "%s" in parent "%s"', elemChildCss, elemParent);
    }
  }

  /**
   * Close current browser window 
   */
  async close(){
    log.debug('Close browser window');  
    if (this.driver) {
      try {
        await this.driver.close();
      } catch(err) {
        log.error('driver close error:', err);
      }
    }
  }
  
  /**
   * Quit the Browser Driver 
   */
  async stop(){
    log.debug('Browser stop');
    if (this.driver) {
      try {
        await this.driver.quit();
      } catch(err) {
        log.error('driver quit error:', err);
      }
      this.driver = null;
    }
    this.emit('stop');
  }
}
