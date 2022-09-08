const log = require('debug-level').log('test:seleniumCommons');
const { timeout } = require('async');
const chai = require('chai');
chai.use(require('chai-datetime'));
const { assert, expect } = require('chai');
const {
    WEB_URL,
    sleep,
} = require('../common');
const RtcClient = require('../rtc-client');

/**
 * @enum {string}
 */
let STATE = {
    PLAY: 'play',
    PAUSE: 'pause',
    STOP: 'stop'
};

function getIdFromUrl(roomUrl){   
    let splitUrl = roomUrl.split('/');
    return splitUrl[4];
}

async function createBrowserClient(id, url, bunner = false){     
    let browserClient = new RtcClient({ 
        url, 
        id
    });
    //add attributes: video, audio and screen State
    browserClient.videoState = STATE.STOP;
    browserClient.screenState = STATE.STOP;
    browserClient.audioState = STATE.STOP;
    //Open tab and check title
    await browserClient.openBrowser();
    let pageTitle = await browserClient.getTitle();
    expect(pageTitle).to.equal('QuavStreams (dev)');
    await sleep(0.8);
    //bunner
    if(bunner){
        let bunnerCss = '.cc-compliance > a';
        await browserClient.clickElement(bunnerCss);
    }
    return browserClient;
}

async function login(browserClient, email, password){
    let menuButton = await browserClient.getElement('app-root > div button');
    expect(await menuButton.getAttribute('ng-reflect-message')).to.equal('Menu');
    await menuButton.click();
    await sleep(0.5);
    await browserClient.clickElement('a[href="/login"]');
    let currentUrl = await browserClient.getCurrentUrl();
    expect(currentUrl).to.equal('https://localhost/login');
    //insert email and password
    let emailInput = await browserClient.getElement('input[formcontrolname="email"]');
    expect(emailInput).to.be.not.null;
    emailInput.clear();
    emailInput.sendKeys(email);
    let passwordInput = await browserClient.getElement('input[formcontrolname="password"]');
    expect(passwordInput).to.be.not.null;
    passwordInput.clear();
    passwordInput.sendKeys(password);
    await browserClient.clickElement('mat-card:nth-child(1) button'); 
}

async function getRoom(browserClient, roomUrl){
    await browserClient.getUrl(roomUrl);
    let pageTitle = await browserClient.getTitle();
    expect(pageTitle).to.equal('QuavStreams (dev)');
    await sleep(0.8);
}

async function getRoomDashboard(browserClient){
    let currentUrl = await browserClient.getCurrentUrl();
    if (currentUrl != WEB_URL + '/dashboard/rooms'){
        await browserClient.getUrl(WEB_URL + '/dashboard/rooms');
        await sleep(1);
    }
}

async function selectRoomFromList(browserClient, roomName){
    await getRoomDashboard(browserClient);
    //select room
    let roomList = await browserClient.getElements('tbody > tr');
    let roomTitle;
    for(let i=0; i < roomList.length; i++){
        roomTitle = await browserClient.getElementInElement(roomList[i], 'a.title');    
        if(await roomTitle.getText() == roomName){
            return roomList[i];
        }
    }
    log.error('Room not found');
}

async function selectDeviceFromList(browserClient, deviceDiv, deviceName){
    let deviceOptionsEl = await browserClient.getElementInElement(deviceDiv, 'mat-select');
    await deviceOptionsEl.click();
    await sleep(0.5);
    let deviceList = await browserClient.getElements('div.cdk-overlay-pane span.mat-option-text');
    for(let i=0; i < deviceList.length; i++){
        if(await deviceList[i].getText() == deviceName){
            return deviceList[i];
        }
    }
    log.info('Device not found!');
}

async function getButtonFromListByTitle(buttonList, title){
    for(let i=0; i < buttonList.length; i++){
        if(await buttonList[i].getAttribute('title') == title){
            return buttonList[i];
        }
    }
    log.info('Button not found!');
}

//viewPolicy={public, unlisted, private, password}
async function addConferenceRoom(browserClient, roomTitle, viewPolicy, roomPassword=undefined){
    await browserClient.clickElement('mat-toolbar-row  button[mattooltip="Add a live stream or a conference room"]');
    await browserClient.clickElement('div.cdk-overlay-pane  button[mattooltip="Add a conference room"]');
    let roomTitleInput = await browserClient.getElement('app-room-create input');
    expect(roomTitleInput).to.be.not.null;
    roomTitleInput.clear();
    roomTitleInput.sendKeys(roomTitle);
    await browserClient.clickElement('app-room-create mat-select');
    await browserClient.clickElement('div.cdk-overlay-pane mat-option[ng-reflect-value=' + viewPolicy+ ']');
    if (viewPolicy == 'password'){
        let roomPasswordInput = await browserClient.getElement('app-room-create input[formcontrolname="password"]');
        expect(roomPasswordInput).to.be.not.null;
        roomPasswordInput.clear();
        roomPasswordInput.sendKeys(roomPassword);
    }
    await browserClient.clickElement('app-room-create button[type="submit"]');
    await sleep(1);
}

async function changeVideoPolicy(browserClient, roomName, viewPolicy='unlisted', publishPolicy='guest'){
    let room = await selectRoomFromList(browserClient, roomName);
    let optionButton = await browserClient.getElementInElement(room, 'div.stream-edit-buttons > div:nth-child(1) > button');
    await optionButton.click();
    await sleep(0.5);

    if(viewPolicy != 'unlisted'){
        //change view policy
        await browserClient.clickElement('mat-select[ng-reflect-name="view_policy"]');
        await browserClient.clickElement('mat-option[ng-reflect-value=' + viewPolicy + ']');
    }
    if(publishPolicy != 'guest'){
        //change Publish policy
        await browserClient.clickElement('app-base-edit-dialog mat-tab-header div.mat-tab-labels > div:nth-child(2)'); //room option
        //await browserClient.clickElement('#mat-tab-label-1-1');
        await browserClient.clickElement('mat-select[formcontrolname="rtcPublishPolicy"]');
        await browserClient.clickElement('mat-option[ng-reflect-value=' + publishPolicy + ']');
    }
    //save button
    await browserClient.clickElement('app-room-edit button[type="submit"]');    
}

async function changeRoomOptions(browserClient, roomName, rtcLayout='auto', rtcMaxVideoConsumers=8, rtcAdminViewOnly=false, 
rtcShowMediaSettings=false, rtcLocked=false){
    let room = await selectRoomFromList(browserClient, roomName);
    let optionButton = await browserClient.getElementInElement(room, 'div.stream-edit-buttons > div:nth-child(1) > button');
    await optionButton.click();
    await sleep(0.5);
    await browserClient.clickElement('app-base-edit-dialog mat-tab-header div.mat-tab-labels > div:nth-child(2)'); //room option

    if(rtcLayout == 'full'){
        await browserClient.clickElement('mat-select[formcontrolname="rtcLayout"]');
        await browserClient.clickElement('mat-option[ng-reflect-value=full]');
    }
    if(rtcMaxVideoConsumers != 8){
        let maxConsumerElem = await browserClient.getElement('input[formcontrolname="rtcMaxVideoConsumers"]');
        await maxConsumerElem.clear();
        await maxConsumerElem.sendKeys(rtcMaxVideoConsumers);
    }
    if(rtcAdminViewOnly == true){
        await browserClient.clickElement('mat-select[formcontrolname="rtcAdminViewOnly"]');
        await browserClient.clickElement('mat-option[ng-reflect-value="true"]');
    }
    if(rtcShowMediaSettings == true){
        await browserClient.clickElement('mat-select[formcontrolname="rtcShowMediaSettings"]');
        await browserClient.clickElement('mat-option[ng-reflect-value="true"]');
    }
    if(rtcLocked == true){
        await browserClient.clickElement('mat-select[formcontrolname="rtcLocked"]');
        await browserClient.clickElement('mat-option[ng-reflect-value="true"]');
    }
    //save button
    await browserClient.clickElement('app-room-edit button[type="submit"]');
}

async function checkRoomLocked(browserClient){
    let redContainer = await browserClient.getElement('div.cdk-overlay-pane simple-snack-bar > span');
    let redContainerText = await redContainer.getText();
    expect(redContainerText).to.equal('Room locked');
}

async function getRoomId(browserClient, roomName, password=undefined){
    let room = await selectRoomFromList(browserClient, roomName);
    let roomVideo = await browserClient.getElementInElement(room, 'td:nth-child(2) > div.title-cell > a');   
    await roomVideo.click();
    if(password){
        await insertRoomPassword(browserClient, password);    
    }
    await sleep(1);
    let roomUrl = await browserClient.getCurrentUrl();
    let roomId = getIdFromUrl(roomUrl);
    return roomId;
}

async function insertRoomPassword(browserClient, password){
    let passwordInput = await browserClient.getElement('div.form-row > input');
    expect(passwordInput).to.be.not.null;
    await passwordInput.clear();
    await passwordInput.sendKeys(password);
    await browserClient.clickElement('div.form-row > button');
    await sleep(0.5);
}

async function insertDisplayName(browserClient, name){
    let displayNameInput = await browserClient.getElement('#displayNameInput');
    expect(displayNameInput).to.be.not.null;
    await displayNameInput.clear();
    await displayNameInput.sendKeys(name);
    await browserClient.clickElement('.display-name-settings button');
    await sleep(1);
}

async function videoAudioDialog(browserClient, videoDevice=undefined, videoQuality=undefined,
    audioDevice=undefined, enableAudio=true){
        let dialog = await browserClient.getElement('mat-dialog-container');
        let dialogTitle = await browserClient.getElement('app-base-edit-dialog')
            .then(async(res) => {
                return await res.getAttribute('ng-reflect-dialog-title');
            });
        log.info('dialog title:',dialogTitle);
        let videoSection;
        let audioSection;
        //showSettings
        if(dialogTitle == 'Publish video and audio'){
            videoSection = await browserClient.getElementInElement(dialog, 'div.mat-dialog-content > div:nth-child(1)');
            audioSection = await browserClient.getElementInElement(dialog, 'div.mat-dialog-content > div:nth-child(2)');    
        }
        //video button
        else if(dialogTitle == 'Video settings'){
            videoSection = await browserClient.getElementInElement(dialog, 'div.mat-dialog-content > div.ng-star-inserted');
        }
        //audio button
        else if (dialogTitle == 'Audio settings'){
            audioSection = await browserClient.getElementInElement(dialog, 'div.mat-dialog-content > div.ng-star-inserted');    
        }

        //video
        if(videoSection){
            let titleEl = await browserClient.getElementInElement(videoSection, 'div.section-title');
            expect(await titleEl.getText()).to.equal('Video');
            let videoDiv = await browserClient.getElementInElement(videoSection, 'div:nth-child(2)');
            await browserClient.getElementInElement(videoDiv, 'div:nth-child(1) > video');   //check preview
            let videoOptionDivs = await browserClient.getElementsInElement(videoDiv, 'div:nth-child(2) > mat-form-field');  //options div
            expect(videoOptionDivs.length).to.equal(2);
            if(videoDevice){
                let device = await selectDeviceFromList(browserClient, videoOptionDivs[0], videoDevice);
                await device.click();
                await sleep(0.5);          
            }
            if(videoQuality){
                let qualityOptionsEl = await browserClient.getElementInElement(videoOptionDivs[1], 'mat-select');
                await qualityOptionsEl.click();
                let qualityOptions = await browserClient.getElements('div.cdk-overlay-pane mat-option');
                expect(qualityOptions.length).to.equal(3);
                switch(videoQuality){
                    case 360:
                        await qualityOptions[0].click();
                        break;
                    case 540:
                        await qualityOptions[1].click();
                        break;
                    case 720:
                        await qualityOptions[2].click();
                        break;
                    default:
                        log.info('Wrong video quality! return to 540p');
                        await qualityOptions[1].click();    
                }
                await sleep(1);
                let qualitySetted = await browserClient.getElementInElement(qualityOptionsEl, 'div > div > span > span')
                    .then(async (result) => {
                        return await result.getText();
                    });
                log.info("Quality setted:", qualitySetted);
            }
        }

        //audio
        if(audioSection){
            let titleEle = await browserClient.getElementInElement(audioSection, 'div.section-title');
            expect(await titleEle.getText()).to.equal('Audio');
            let audioDeviceMenu = await browserClient.getElementInElement(audioSection, 'div:nth-child(2) > mat-form-field');
            let updateDevButton = await browserClient.getElementInElement(audioSection, 'div:nth-child(2) > button');
            expect(await updateDevButton.getAttribute('title')).to.equal('Update devices');
            let enableAudioSlide = await browserClient.getElementInElement(audioSection, 'div:nth-child(2) > mat-slide-toggle');
            let audioState = await enableAudioSlide.getAttribute('ng-reflect-checked');
            if(audioDevice){
                let device = await selectDeviceFromList(browserClient, audioDeviceMenu, audioDevice);
                await device.click();
                await sleep(0.5);            
            }
            if(enableAudio){
                if(audioState == "false"){
                    await enableAudioSlide.click();
                    browserClient.audioState = STATE.PLAY;
                }
                audioState = await enableAudioSlide.getAttribute('ng-reflect-checked');
                expect(audioState).to.equal('true');
            }
            else{
                if(audioState == 'true'){
                    await enableAudioSlide.click();
                    browserClient.audioState = STATE.PAUSE;
                }
                audioState = await enableAudioSlide.getAttribute('ng-reflect-checked');
                expect(audioState).to.equal('false');
            }    
        }

        //Advanced settings

        //publish or save
        let publishButton = await browserClient.getElementInElement(dialog, 'div.mat-tooltip-trigger > button[type="submit"]');
        await publishButton.click();
        await sleep(1);
}

async function screenShareDialog(browserClient, videoQuality=undefined){
    let dialog = await browserClient.getElement('mat-dialog-container');
    let dialogTitle = await browserClient.getElement('app-base-edit-dialog')
        .then(async(res) => {
            return await res.getAttribute('ng-reflect-dialog-title');
        });
    log.info('dialog title:',dialogTitle);
    expect(dialogTitle).to.equal('Screenshare settings');
    let videoSection = await browserClient.getElementInElement(dialog, 'div.mat-dialog-content > div.ng-star-inserted');
    let titleEl = await browserClient.getElementInElement(videoSection, 'div.section-title');
    expect(await titleEl.getText()).to.equal('Video');
    if(videoQuality){
        let qualityOptionsEl = await browserClient.getElementInElement(videoSection, 'mat-select');
        await qualityOptionsEl.click();
        let qualityOptions = await browserClient.getElements('div.cdk-overlay-pane mat-option');
        expect(qualityOptions.length).to.equal(4);
        switch(videoQuality){
            case 360:
                await qualityOptions[0].click();
                break;
            case 540:
                await qualityOptions[1].click();
                break;
            case 720:
                await qualityOptions[2].click();
                break;
            case 1080:
                await qualityOptions[3].click();
                break;
            default:
                log.info('Wrong video quality! return to 720p');
                await qualityOptions[2].click();    
        }
        await sleep(1);
        let qualitySetted = await browserClient.getElementInElement(qualityOptionsEl, 'div > div > span > span')
            .then(async (result) => {
                return await result.getText();
            });
        log.info("Quality setted:", qualitySetted);
    }
    //publish or save
    let publishButton = await browserClient.getElementInElement(dialog, 'div.mat-tooltip-trigger > button[type="submit"]');
    await publishButton.click();
    await sleep(2);
}

async function getControlBar(browserClient){
    return await browserClient.getElements('mat-sidenav-content > div.rtc-controls > button');
}

async function getButtonFromBar(buttonList, nameReflected){
    for(let i=0; i < buttonList.length; i++){
        if(await buttonList[i].getAttribute('title') == nameReflected){
            return buttonList[i];
        }
    }
    return;
}

/**
 * Publish video and audio button in control bar
 * @param {RtcClient} browserClient
 * @param {boolean} [showSettings = false] 
 * @param {string} [videoDevice = undfined]
 * @param {number} [videoQuality = 540]   Can be 360, 540 or 720
 * @param {string} [audioDevice = undefined] Video options for settings dialogs
 * @param {boolean} [enableAudio = true]  The video device name
 */
async function publishAudioVideo(browserClient, showSettings=false, 
    {videoDevice, videoQuality} = {videoDevice: undefined, videoQuality: undefined},
    {audioDevice, enableAudio} = {audioDevice: undefined, enableAudio: true}){
        //Buttons check list
        let controlButtonsList = await getControlBar(browserClient);
        // log.debug(controlButtonsList.length);
        // controlButtonsList.map(async function (button){
        //     log.debug(await button.getAttribute('title'));
        // }); 
        expect(controlButtonsList.length).to.equal(4);
        expect(await controlButtonsList[0].getAttribute('title')).to.equal('Publish audio & video [v]');
        expect(await controlButtonsList[1].getAttribute('title')).to.equal('Publish audio [a]');
        expect(await controlButtonsList[2].getAttribute('title')).to.equal('Publish screen share [s]');  
        //expect(await controlButtonsList[3].getAttribute('title')).to.equal('Toggle chat [c]');     
        
        //Publish video and audio
        await controlButtonsList[0].click();
        await sleep(1);
        browserClient.videoState = STATE.PLAY;
        browserClient.audioState = STATE.PLAY;

        if(showSettings){
            await videoAudioDialog (browserClient, videoDevice, videoQuality, audioDevice, enableAudio);
        }

        //checkLocalVideo
        await checkParticipants(browserClient);      

        //Buttons check list
        controlButtonsList = await browserClient.getElements('div.rtc-controls > button');
        expect(controlButtonsList.length).to.equal(3);     
        expect(await controlButtonsList[0].getAttribute('title')).to.equal('Publish screen share [s]');
        expect(await controlButtonsList[1].getAttribute('title')).to.equal('Stop all audio and video [q]');
        //expect(await controlButtonsList[2].getAttribute('title')).to.equal('Toggle chat [c]');

}

/**
 * Check control bar to not publish video
 * @param {RtcClient} browserClient 
 */
async function cannotPublishVideo(browserClient){
    //Buttons check list       
    let controlButtonsList = await getControlBar(browserClient);
    expect(controlButtonsList.length).to.equal(2);
    expect(await controlButtonsList[0].getAttribute('title')).to.equal('Toggle fullscreen');
    //expect(await controlButtonsList[0].getAttribute('title')).to.equal('Toggle chat [c]');  
}

/**
 * Video settings button in control bar
 * @param {RtcClient} browserClient
 * @param {object} videoOptions Video options and settings dialogs
 * @param {boolean} [videoOptions.pause = false]   Pause video
 * @param {boolean} [videoOptions.resume = false]  Resume video
 * @param {boolean} [videoOptions.stop = false]    Stop the video
 * @param {string} [videoOptions.videoDevice = undefined]  The video device name
 * @param {number} [videoOptions.videoQuality = 540] Must be 360, 540 or 720
 * @param {object} screenOptions Screen share options and settings dialogs
 * @param {boolean} [screenOptions.pause = false]   Pause screen share
 * @param {boolean} [screenOptions.resume = false]  Resume screen share
 * @param {boolean} [screenOptions.stop = false]    Stop screen share
 * @param {number} [screenOptions.videoQuality = 720] Must be 360, 540, 720 or 1080
 */
async function videoSettings(browserClient,  
    videoOptions = {pause: false, resume: false, stop: false, deviceName: undefined, videoQuality: undefined },
    screenOptions = {pause: false, resume: false, stop: false, videoQuality: undefined}){
        let videoSettingsButton = await browserClient.getElement('div.rtc-controls > app-base-menu[ng-reflect-icon="videocam"] > button');//app-base-menu:nth-child(2)
        await videoSettingsButton.click();
        await sleep(1);
        let videoMenuOptionList= await browserClient.getElements('div.cdk-overlay-pane div[role="menuitem"]');
        let videoButtons;
        let videoMenuOption;
        let screenButtons;
        let screenMenuOption;
        if(browserClient.videoState == STATE.PLAY && browserClient.screenState == STATE.PLAY){
            expect(videoMenuOptionList.length).to.equal(2);
            videoButtons = await browserClient.getElementsInElement(videoMenuOptionList[0], 'button');
            videoMenuOption = await browserClient.getElementInElement(videoMenuOptionList[0], 'span');
            screenButtons = await browserClient.getElementsInElement(videoMenuOptionList[1], 'button');
            screenMenuOption = await browserClient.getElementInElement(videoMenuOptionList[1], 'span');
        }
        else if (browserClient.videoState == STATE.PLAY){
            expect(videoMenuOptionList.length).to.equal(1);
            videoMenuOption = await browserClient.getElementInElement(videoMenuOptionList[0], 'span');
            videoButtons = await browserClient.getElements('div.cdk-overlay-pane > div[role="menu"] button');
            expect(videoButtons.length).to.equal(3);
            //expect(await buttons[0].getAttribute('title')).to.equal('Pause');
            expect(await videoButtons[1].getAttribute('title')).to.equal('Settings');
            expect(await videoButtons[2].getAttribute('title')).to.equal('Stop');
        }
        else if (browserClient.screenState == STATE.PLAY){
            expect(videoMenuOptionList.length).to.equal(1);
            screenMenuOption = await browserClient.getElementInElement(videoMenuOptionList[0], 'span');
            screenButtons = await browserClient.getElements('div.cdk-overlay-pane > div[role="menu"] button');
            expect(screenButtons.length).to.equal(3);
            //expect(await buttons[0].getAttribute('title')).to.equal('Pause');
            expect(await screenButtons[1].getAttribute('title')).to.equal('Settings');
            expect(await screenButtons[2].getAttribute('title')).to.equal('Stop');
        }

        //pause video
        if(videoOptions.pause){
            if(await videoButtons[0].getAttribute('title') == 'Pause'){
                await videoButtons[0].click();
                await sleep(1);
                expect(await videoButtons[0].getAttribute('title')).to.equal('Resume');
                log.info("Video paused");
                browserClient.videoState = STATE.PAUSE;
            }
            else{
                log.info("Invalid action: Video already paused")
            }
        }
        //resume video
        if(videoOptions.resume){
            if(await videoButtons[0].getAttribute('title') == 'Resume'){
                await videoButtons[0].click();
                await sleep(1);
                expect(await videoButtons[0].getAttribute('title')).to.equal('Pause');
                log.info("Video resumed");
                browserClient.videoState = STATE.PLAY;
            }
            else{
                log.info("Invalid action: Video already play");
            }     
        }
        //stop video
        if(videoOptions.stop){
            await videoButtons[2].click();
            browserClient.videoState = STATE.STOP;
        }
        else if(videoOptions.pause || videoOptions.resume){
            await videoMenuOption.click();
        }
        await sleep(1);
        //set device/quality
        if(videoOptions.videoDevice || videoOptions.videoQuality){
            await videoButtons[1].click();
            await sleep(1);
            await videoAudioDialog(browserClient, videoOptions.videoDevice, videoOptions.videoQuality);
            browserClient.videoState = STATE.PLAY;
        }

        //pause screen share
        if(screenOptions.pause){
            if(await screenButtons[0].getAttribute('title') == 'Pause'){
                await screenButtons[0].click();
                await sleep(1);
                expect(await screenButtons[0].getAttribute('title')).to.equal('Resume');
                log.info("screen share paused");
                browserClient.screenState = STATE.PAUSE;
            }
            else{
                log.info("Invalid action: Screen share already paused")
            }
        }
        //resume screen share
        if(screenOptions.resume){
            if(await screenButtons[0].getAttribute('title') == 'Resume'){
                await screenButtons[0].click();
                await sleep(1);
                expect(await screenButtons[0].getAttribute('title')).to.equal('Pause');
                log.info("Screen share resumed");
                browserClient.screenState = STATE.PLAY;
            }
            else{
                log.info("Invalid action: Screen share already play");
            }     
        }
        //stop screen share 
        if(screenOptions.stop){
            await screenButtons[2].click();
            browserClient.screenState = STATE.STOP;
        }
        else if(screenOptions.pause || screenOptions.resume){ //exit from menu
            await screenMenuOption.click();
        }
        await sleep(1);
        //set device/quality
        if(screenOptions.videoQuality){
            await screenButtons[1].click();
            await sleep(1);
            await screenShareDialog(browserClient, screenOptions.videoQuality);
            browserClient.videoState = STATE.PLAY;
        }

        //checkLocalVideo
        if(browserClient.videoState == STATE.PLAY || browserClient.screenState == STATE.PLAY){
            await checkParticipants(browserClient);
        }      
}

/**
 * Audio settings button in control bar
 * @param {RtcClient} browserClient
 * @param {boolean} [pause = false] 
 * @param {boolean} [resume = false]
 * @param {boolean} [stop = false]   Stop the audio
 * @param {object} options Audio options for settings dialogs
 * @param {string} [options.audioDevice = undefined]  The audio device name
 * @param {boolean} [options.enableAudio = true]
 */
async function audioSettings(browserClient,
    {pause, resume, stop} = {pause: false, resume: false, stop: false}, 
    options = { audioDevice: undefined, enableAudio: undefined }){
        let audioSettingsButton = await browserClient.getElement('div.rtc-controls > app-base-menu:nth-child(3) > button');
        await audioSettingsButton.click(); 
        // let audioOptionDiv = await browserClient.getElement('div.cdk-overlay-pane div[role="menuitem"] > span');
        let audioOptionDiv = await browserClient.getElement('span.device-name');

        let buttons = await browserClient.getElements('div.cdk-overlay-pane > div[role="menu"] button');
        expect(buttons.length).to.equal(3);
        //expect(await buttons[0].getAttribute('title')).to.equal('Pause');
        expect(await buttons[1].getAttribute('title')).to.equal('Settings');
        expect(await buttons[2].getAttribute('title')).to.equal('Stop');

        //pause audio
        if(pause && browserClient.audioState != STATE.PAUSE){
            if(await buttons[0].getAttribute('title') == 'Pause'){
                await buttons[0].click();
                await sleep(1);
                expect(await buttons[0].getAttribute('title')).to.equal('Resume');
                log.info("Audio paused");
                browserClient.audioState = STATE.PAUSE;
            }
            else{
                log.info("Invalid action: Audio already paused")
            }      
        }
        //resume audio
        if(resume && browserClient.audioState == STATE.PAUSE){
            if(await buttons[0].getAttribute('title') == 'Resume'){
                await buttons[0].click();
                await sleep(1);
                expect(await buttons[0].getAttribute('title')).to.equal('Pause');
                log.info("Audio resumed");
                browserClient.audioState = STATE.PLAY;
            }
            else{
                log.info("Invalid action: Audio already play");
            }
        }

        //stop audio
        if(stop && browserClient.audioState != STATE.STOP){
            await buttons[2].click();
            await sleep(1);
            browserClient.audioState = STATE.STOP;
        }
        else if(pause || resume){
            await audioOptionDiv.click();
            await sleep(1);
        }
    
        //set device/quality
        if(options.audioDevice || options.enableAudio != undefined){
            await buttons[1].click();
            await sleep(1);
            await videoAudioDialog(browserClient, options.deviceName, options.enableAudio);
            if(options.enableAudio){
                browserClient.audioState = STATE.PLAY;
            }
            else{
                browserClient.audioState = STATE.PAUSE;
            }
        }
}

/**
 * Stop audio and video with button in control bar
 * @param {RtcClient} browserClient
 */
async function stopAudioVideo(browserClient){
    await getButtonFromBar(await getControlBar(browserClient), 'Stop all audio and video [q]')
        .then(async (redButton) => {await redButton.click()})
        .catch(() => {log.info('Red button not found')});
    //Buttons check list
    await sleep(0.5);
    let controlButtonsList = await getControlBar(browserClient);
    expect(controlButtonsList.length).to.equal(4);
    expect(await controlButtonsList[0].getAttribute('title')).to.equal('Publish audio & video [v]');
    expect(await controlButtonsList[1].getAttribute('title')).to.equal('Publish audio [a]');
    expect(await controlButtonsList[2].getAttribute('title')).to.equal('Publish screen share [s]');
    //expect(await controlButtonsList[3].getAttribute('title')).to.equal('Toggle chat [c]');

    browserClient.videoState = STATE.STOP;
    browserClient.audioState = STATE.STOP;
    browserClient.screenState = STATE.STOP;
}

/**
 * Check local and remote partecipants
 * @param {RtcClient} browserClient
 * @param {boolean} localParticipant True if video play or screen share
 * @param {number} [remoteParticipants=undefined] The number of remote participants that is publishing
 * @param {number} [visible=undefined]  The number of visible remote participants
 */
async function checkParticipants(browserClient, localParticipant = false, 
    remoteParticipants=undefined, visible=undefined){
        let vGrid = await browserClient.getElement('app-base-grid > div.grid-container');
        // check local video
        if(browserClient.videoState == STATE.PLAY || browserClient.screenState == STATE.PLAY){
            let localP = await browserClient.getElement('app-local-participant app-base-grid > div.grid-container');
            let localVideoList = await browserClient.getElementsInElement(localP, 'video');
            if(localVideoList.length == 2){
                log.info("video and screen share published");
            }
            else if(browserClient.videoState){
                log.info("video published");
            }
            else if(browserClient.screenState){
                log.info("screen share published");
            }
        }  
        // check # remote videos
        if(remoteParticipants){
            let remoteV = await browserClient.getElementsInElement(vGrid, 'app-remote-participant');
            expect(remoteV.length).to.equal(remoteParticipants);
        }
        //check # remote visible/hidden  
        if(visible){
            let remoteVideoDivs = await browserClient.getElementsInElement(vGrid, 'div.rtc-item.ng-star-inserted');
            let hidden = 0;
            let vis = 0;
            for (let i=0; i<remoteVideoDivs.length; i++){
                if(await remoteVideoDivs[i].getAttribute('data-hidden') == 'true'){
                    hidden++; 
                }
                else{
                    vis++;
                }
            }
            expect(hidden).to.equal(remoteVideoDivs.length - visible);
            expect(vis).to.equal(visible);
        }
}

async function shareScreen(browserClient){
    if(browserClient.screenState != STATE.PLAY){
        await getButtonFromBar(await getControlBar(browserClient), 'Publish screen share [s]')
        .then(async(shareButton) => {
            await shareButton.click();
            await sleep(1);
        })
        .catch(() => {
            log.debug("Share Button Error");
        });
        browserClient.screenState = STATE.PLAY;
        //check video screen
        await checkParticipants(browserClient);
    }
    else{
        log.info("Screen already shared")
    }


    //add choise screen to share

}

// {lockRoom, roomSettings, shareRoom, enableVideoComp, publishStream}
async function showMoreOptions(browserClient, {lockRoom} = {lockRoom: undefined}){
    await browserClient.getElement('#moreOptionsButton > button')
        .then(async (moreOptionsButton) => {
            await moreOptionsButton.click();
            
        })
        .catch(()=>{log.info('More options button not found')});
    let menuButtons = await browserClient.getElements('div.cdk-overlay-pane > div[role="menu"]  button');
    expect(menuButtons.length).to.equal(6);

    //Lock Room
    if(lockRoom){
        await getButtonFromListByTitle(menuButtons, 'Lock room')
            .then(async (button) => {
                await button.click();
                await sleep(1);
            })
        //check room locked text
        await browserClient.getElement('div[ng-reflect-ng-class="rtc-locked-active"] > span')
            .then(async (res) => {
                expect(await res.getText()).to.equal('Room locked');
            });
    }
    else{
        await getButtonFromListByTitle(menuButtons, 'Unlock room')
        .then(async (button) => {
            await button.click();
            await sleep(1);
        })
    }

}

module.exports = {
    STATE,
    createBrowserClient,
    login,
    getRoom,
    getRoomDashboard,
    selectRoomFromList,
    selectDeviceFromList,
    getButtonFromListByTitle,
    addConferenceRoom,
    changeVideoPolicy,
    changeRoomOptions,
    checkRoomLocked,
    getRoomId,
    insertRoomPassword,
    insertDisplayName,
    videoAudioDialog,
    screenShareDialog,
    getControlBar,
    getButtonFromBar,
    publishAudioVideo,
    cannotPublishVideo,
    videoSettings,
    audioSettings,
    stopAudioVideo,
    checkParticipants,
    shareScreen,
    showMoreOptions,
}