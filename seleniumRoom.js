/*jshint node:true */
'use strict';

const log = require('debug-level').log('test:seleniumRoom:rtc');
const config = require('../../config');
const chai = require('chai');
chai.use(require('chai-datetime'));
const { assert, expect } = require('chai');
const {
    WEB_URL,
    request,
    deleteAllTests,
    createTestUsers,
    sleep,
} = require('../common');
const RtcClient = require('./rtc-client');
const { generateTestRawVideo, generateTestRawAudio, } = require('../../util/ffmpeg');
const { 
    STATE,
    createBrowserClient,
    login,
    getRoom,
    addConferenceRoom,
    changeVideoPolicy,
    changeRoomOptions,
    checkRoomLocked,
    getRoomId,
    insertRoomPassword,
    insertDisplayName,
    publishAudioVideo,
    cannotPublishVideo,
    videoSettings,
    audioSettings,
    stopAudioVideo,
    checkParticipants,
    shareScreen,
    showMoreOptions,
 } = require('./seleniumCommons');

describe('seleniumRoom rtc', function(){
    let chromeClient1Owner, chromeClient2Guest, chromeClient3Login;
    let adminToken, user1, user2;
    let room1Id, room2Id;
    let guest1, guest2, guest3;
    //debug1: general room check
    let debug1 = true; 
    //debug2: rtcPublishPolicy
    let debug2 = true;
    //debug3: rtcLayout
    let debug3 = true;
    //debug4: rtcAdminViewOnly, rtcShowMediaSetting, rtcLocked
    let debug4 = true;
    //debug5: more options control bar button
    let debug5 = true;


    before(async function(){
        await deleteAllTests();

        // create 2 users and 1 admin
        const ret = await createTestUsers();
        adminToken = ret.adminToken;
        user1 = ret.user1;
        user2 = ret.user2;

        //create fake video
        const duration = 10;
        await generateTestRawVideo(640, 360, 25, duration);
        await generateTestRawAudio(duration);         

    });

    after(async function(){
        //ERROR: first driver.quit() close server connection
        if(chromeClient1Owner){
            await chromeClient1Owner.stop();
        }
        // if(chromeClient2Guest){
        //     await chromeClient2Guest.stop();
        // };
        // if(chromeClient3Login){
        //     await chromeClient3Login.stop();
        // };
        // if (guest1){
        //     await guest1.stop();
        // }
        // if (guest2){
        //     await guest2.stop();
        // }
        // if (guest3){
        //     await guest3.stop();
        // }               
    });

    it('seleniumRoom:rtc user1 can login', async function(){
        //create chrome client
        let id = `${process.pid}`;
        let url = WEB_URL; 
        chromeClient1Owner = await createBrowserClient(id, url, true);

        //user1 login
        await login(chromeClient1Owner, user1.email, 'password1');        
    }).timeout(9000);

    if(debug1){
        it('seleniumRoom:rtc user1 can create room, video/audio settings', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room', 'public');
            room1Id = await getRoomId(chromeClient1Owner, 'TEST_room');
        }).timeout(10000);
        
        // check in DB
        it('seleniumRoom:rtc check room in DB, video/audio settings', async function(){
            const room = await request('/Room/'+room1Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room');
            expect(room.view_policy).to.equal('public');
        });

        //publish video and check control buttons
        it('seleniumRoom:rtc user1 can publish in room1, test control buttons', async function(){
            //publish video and audio
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            //pause video
            await videoSettings(chromeClient1Owner, {pause: true});
            expect(chromeClient1Owner.videoState).to.equal(STATE.PAUSE);
            //pause audio
            await audioSettings(chromeClient1Owner, {pause: true});
            expect(chromeClient1Owner.audioState).to.equal(STATE.PAUSE);    
            //Red button check and push
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(10000);

        it('seleniumRoom:rtc user1 can change video options from button', async function(){
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            await videoSettings(chromeClient1Owner,
                 {deviceName: '/tmp/video.y4m', videoQuality: 540});
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(13000);

        it('seleniumRoom:rtc user1 can change audio options from button', async function(){
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            await audioSettings(chromeClient1Owner, {pause: false}, {enableAudio: false});
            expect(chromeClient1Owner.audioState).to.equal(STATE.PAUSE);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(6000);

        it('seleniumRoom:rtc user1 can publish video and share screen', async function(){
            await publishAudioVideo(chromeClient1Owner);
            await shareScreen(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.screenState).to.equal(STATE.PLAY);
            //pause screen
            await videoSettings(chromeClient1Owner, {}, {pause: true});
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.screenState).to.equal(STATE.PAUSE);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);     
        }).timeout(14000);
   
    }
    if(debug2){
        it('seleniumRoom:rtc user1 can create password room1', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room1', 'password', 'testPassword');
        }).timeout(3000);
 
        it('seleniumRoom:rtc user1 can open room1 and get room id', async function(){    
            room1Id = await getRoomId(chromeClient1Owner, 'TEST_room1');
        }).timeout(7000);    
        //check in DB
        it('seleniumRoom:rtc check room1 in DB', async function(){
            const room = await request('/Room/'+room1Id, 'GET', { password: 'testPassword' }, {}, user1.token);
            expect(room.title).to.equal('TEST_room1');
            expect(room.view_policy).to.equal('password');
            expect(room.rtcPublishPolicy).to.equal('guest');
            expect(room.auth).to.be.true;
        });
     
        it('seleniumRoom:rtc user1 can publish in room1', async function(){
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(6000);
    
        //rtcPublishPolicy: guest
        it('seleniumRoom:rtc not logged in user can get room1, rtcPublishPolicy: guest', async function(){
            //create chromium client
            let id = `${process.pid}`;
            let url = WEB_URL + '/room/' + room1Id;
            chromeClient2Guest = await createBrowserClient(id, url); 
            
            //insert passwordinput
            await insertRoomPassword(chromeClient2Guest, 'testPassword');
    
            //insert display name
            await insertDisplayName(chromeClient2Guest, 'Guest');
    
        }).timeout(8000);
   
        it('seleniumRoom:rtc not logged in user can publish in room1, rtcPublishPolicy: guest', async function(){ 
            await publishAudioVideo(chromeClient2Guest);
            expect(chromeClient2Guest.videoState).to.equal(STATE.PLAY);
            expect(chromeClient2Guest.audioState).to.equal(STATE.PLAY);  
            await stopAudioVideo(chromeClient2Guest);
            expect(chromeClient2Guest.videoState).to.equal(STATE.STOP);
            expect(chromeClient2Guest.audioState).to.equal(STATE.STOP); 
            expect(chromeClient2Guest.screenState).to.equal(STATE.STOP);
        }).timeout(5000); 

        //rtc publish policy: login
        it('seleniumRoom:rtc user1 can make room1 public and rtcPublishPolicy: login', async function(){
            await changeVideoPolicy(chromeClient1Owner, 'TEST_room1', 'public', 'login');
        }).timeout(7000);
        //check in DB
        it('seleniumRoom:rtc check room1 in DB, viewPolicy=public, rtcPublishPolicy: login', async function(){
            const room = await request('/Room/'+room1Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room1');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcPublishPolicy).to.equal('login');
        });
    
        it('seleniumRoom:rtc not logged in user can get room1, rtcPublishPolicy: login', async function(){
            if(!chromeClient2Guest){
                let id = `${process.pid}`;
                let url = WEB_URL;
                chromeClient2Guest = await createBrowserClient(id, url);
            }   
            await getRoom(chromeClient2Guest, WEB_URL + '/room/' + room1Id);
            await insertDisplayName(chromeClient2Guest, 'Guest');
        }).timeout(9000);
    
        it('seleniumRoom:rtc not logged in user can not publish in room1, rtcPublishPolicy: login', async function(){    
            await cannotPublishVideo(chromeClient2Guest);
            await chromeClient2Guest.close();        
        }).timeout(3000); 
    
        it('seleniumRoom:rtc user2 can login', async function(){
            //create chrome client
            let id = `${process.pid}`;
            let url = WEB_URL; 
            chromeClient3Login = await createBrowserClient(id, url);     
    
            //user2 login
            await login(chromeClient3Login, user2.email, 'password2'); 
        }).timeout(8000);
    
        it('seleniumRoom:rtc user2 can get room1, rtcPublishPolicy: login', async function(){
            //Open new tab
            await chromeClient3Login.newTab();
            await getRoom(chromeClient3Login, WEB_URL + '/room/' + room1Id);
        }).timeout(4000);
    
        it('seleniumRoom:rtc user2 can publish in room1', async function(){
            await publishAudioVideo(chromeClient3Login);
            expect(chromeClient3Login.videoState).to.equal(STATE.PLAY);
            expect(chromeClient3Login.audioState).to.equal(STATE.PLAY);  
            await stopAudioVideo(chromeClient3Login);
            expect(chromeClient3Login.videoState).to.equal(STATE.STOP);
            expect(chromeClient3Login.audioState).to.equal(STATE.STOP); 
            expect(chromeClient3Login.screenState).to.equal(STATE.STOP);
        }).timeout(5000);
   
        //rtc publish policy: owner
        it('seleniumRoom:rtc user1 can make room1 rtcPublishPolicy=owner', async function(){
            await changeVideoPolicy(chromeClient1Owner, 'TEST_room1', 'public', 'owner');  
        }).timeout(6000);   
        //check in DB
        it('seleniumRoom:rtc check room1 in DB, rtcPublishPolicy=owner', async function(){
            const room = await request('/Room/'+room1Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room1');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcPublishPolicy).to.equal('owner');
        });
    
        it('seleniumRoom:rtc user1 can publish in room1, rtcPublishPolicy=owner', async function(){
            room1Id = await getRoomId(chromeClient1Owner, 'TEST_room1');
            await publishAudioVideo(chromeClient1Owner);
            await stopAudioVideo(chromeClient1Owner);  
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);  
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);  
        }).timeout(6000);
   
        it('seleniumRoom:rtc user2 can get room1, rtcPublishPolicy=owner', async function(){
            if(!chromeClient3Login){
                let id = `${process.pid}`;
                let url = WEB_URL; 
                chromeClient3Login = await createBrowserClient(id, url);  
            }
            await getRoom(chromeClient3Login, WEB_URL + '/room/' + room1Id);
        }).timeout(8000);
    
        it('seleniumRoom:rtc user2 can not publish in room1, rtcPublishPolicy=owner', async function(){
            await cannotPublishVideo(chromeClient3Login);
            await chromeClient3Login.close();
            await chromeClient3Login.switchTab(0);
            await chromeClient3Login.close();
        }).timeout(3000);    
    
    }
    if(debug3){
        //rtcLayout and rtcMaxVideoConsumer
        it('seleniumRoom:rtc user1 can create room, rtcLayout=auto, rtcMaxVideoConsumer=1', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room_layout', 'public');
            await changeRoomOptions(chromeClient1Owner, 'TEST_room_layout', 'auto', 2);
            room2Id = await getRoomId(chromeClient1Owner, 'TEST_room_layout');
        }).timeout(10000);
        //check in DB
        it('seleniumRoom:rtc check room in DB, rtcLayout=auto', async function(){
            const room = await request('/Room/'+room2Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_layout');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcLayout).to.equal('auto');
            expect(room.rtcMaxVideoConsumers).to.equal(2);
        });

        it('seleniumRoom:rtc three not logged in users can publish in room, rtcLayout=auto', async function(){ 
            //create 3 not logged users
            let url = WEB_URL + '/room/' + room2Id;
            let id = `${process.pid}`;
            guest1 = await createBrowserClient(id,url);
            await insertDisplayName(guest1, 'Guest1');
            await publishAudioVideo(guest1);
            expect(guest1.videoState).to.equal(STATE.PLAY);
            expect(guest1.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest1, {pause: true});
            guest2 = await createBrowserClient(id,url);
            await insertDisplayName(guest2, 'Guest2');
            await publishAudioVideo(guest2);
            expect(guest2.videoState).to.equal(STATE.PLAY);
            expect(guest2.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest2, {pause: true});
            guest3 = await createBrowserClient(id,url);
            await insertDisplayName(guest3, 'Guest3');
            await publishAudioVideo(guest3);
            expect(guest3.videoState).to.equal(STATE.PLAY);
            expect(guest3.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest3, {pause: true});    
        }).timeout(32000);

        it('seleniumRoom:rtc user1 can view only two participant', async function(){
            await checkParticipants(chromeClient1Owner, false, 3, 2);
            guest1.close();
            guest2.close();
            guest3.close();
        });

        it('seleniumRoom:rtc user1 can change room option, rtcLayout=full', async function(){
            await changeRoomOptions(chromeClient1Owner, 'TEST_room_layout', 'full');
            room2Id = await getRoomId(chromeClient1Owner, 'TEST_room_layout');
        }).timeout(9000);

        //check in DB
        it('seleniumRoom:rtc check room in DB, rtcLayout=full', async function(){
            const room = await request('/Room/'+room2Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_layout');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcLayout).to.equal('full');
        });

        it('seleniumRoom:rtc three not logged in users can publish in room, rtcLayout=full', async function(){ 
            //create 3 not logged users
            let url = WEB_URL + '/room/' + room2Id;
            let id = `${process.pid}`;
            guest1 = await createBrowserClient(id,url);
            await insertDisplayName(guest1, 'Guest1');
            await publishAudioVideo(guest1);
            expect(guest1.videoState).to.equal(STATE.PLAY);
            expect(guest1.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest1, {pause: true});
            guest2 = await createBrowserClient(id,url);
            await insertDisplayName(guest2, 'Guest2');
            await publishAudioVideo(guest2);
            expect(guest2.videoState).to.equal(STATE.PLAY);
            expect(guest2.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest2, {pause: true});
            guest3 = await createBrowserClient(id,url);
            await insertDisplayName(guest3, 'Guest3');
            await publishAudioVideo(guest3);
            expect(guest3.videoState).to.equal(STATE.PLAY);
            expect(guest3.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest3, {pause: true});      
        }).timeout(33000);

        it('seleniumRoom:rtc user1 can view all participant', async function(){
            await checkParticipants(chromeClient1Owner, false, 3, 3);
            guest1.close();
            guest2.close();
            guest3.close();
        }).timeout(6000);

    }
    if(debug4){

        //rtcAdminViewOnly
        it('seleniumRoom:rtc user1 can create room and publish video, rtcAdminViewOnly', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room_adminViewOnly', 'public');
            await changeRoomOptions(chromeClient1Owner, 'TEST_room_adminViewOnly', 'auto', 8, true);
            room2Id = await getRoomId(chromeClient1Owner, 'TEST_room_adminViewOnly');
            await publishAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            await audioSettings(chromeClient1Owner, {pause: true});
        }).timeout(15000);
        //check in DB
        it('seleniumRoom:rtc check room in DB, rtcAdminOnly', async function(){
            const room = await request('/Room/'+room2Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_adminViewOnly');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcAdminViewOnly).to.be.true;
        });

        it('seleniumRoom:rtc two not logged in users can publish in room', async function(){ 
            //create 2 not logged users
            let url = WEB_URL + '/room/' + room2Id;
            let id = `${process.pid}`;
            guest1 = await createBrowserClient(id,url);
            await insertDisplayName(guest1, 'Guest1');
            await publishAudioVideo(guest1);
            expect(guest1.videoState).to.equal(STATE.PLAY);
            expect(guest1.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest1, {pause: true});
            guest2 = await createBrowserClient(id,url);
            await insertDisplayName(guest2, 'Guest2');
            await publishAudioVideo(guest2);
            expect(guest2.videoState).to.equal(STATE.PLAY);
            expect(guest2.audioState).to.equal(STATE.PLAY);
            await audioSettings(guest2, {pause: true});
            await sleep(3);   
        }).timeout(25000);

        it('seleniumRoom:rtc user1 can view all participant', async function(){
            await checkParticipants(chromeClient1Owner, true, 2);
        }).timeout(6000);
        it('seleniumRoom:rtc other users can view only room owner', async function(){
            await checkParticipants(guest1, true, 1);
            await checkParticipants(guest2, true, 1);
            guest1.close();
            guest2.close();
        }).timeout(7000);

        //rtcShowMediaSetting
        it('seleniumRoom:rtc user1 can create room, rtcShowMediaSetting', async function(){
            
            await addConferenceRoom(chromeClient1Owner, 'TEST_room_showMediaSetting', 'public');      
            await changeRoomOptions(chromeClient1Owner, 'TEST_room_showMediaSetting', 'auto', 8, false, true);
            room2Id = await getRoomId(chromeClient1Owner, 'TEST_room_showMediaSetting');        
        }).timeout(17000);
        //check in DB
        it('seleniumRoom:rtc check room in DB, rtcShowMediaSetting', async function(){
            const room = await request('/Room/'+room2Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_showMediaSetting');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcShowMediaSettings).to.be.true;
        });

        it('seleniumRoom:rtc user1 can set 720p HD quality in dialog before publish', async function(){
            await publishAudioVideo(chromeClient1Owner, true, {videoDevice: '/tmp/video.y4m', videoQuality: 720});
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PLAY);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(9000);

        // it('seleniumRoom:rtc user1 can set 540p Quarter Full HD quality in dialog before publish', async function(){
        //     await publishAudioVideo(chromeClient1Owner, true, '/tmp/video.y4m', 540);
        //     await stopAudioVideo(chromeClient1Owner);
        // }).timeout(7000);

        // it('seleniumRoom:rtc user1 can set 360p Quarter HD quality in dialog before publish', async function(){
        //     await publishAudioVideo(chromeClient1Owner, true, '/tmp/video.y4m', 360);
        //     await stopAudioVideo(chromeClient1Owner);
        // }).timeout(7000);

        it('seleniumRoom:rtc user1 can disable audio in dialog before publish', async function(){
            await publishAudioVideo(chromeClient1Owner, true, {}, {audioDevice: 'Fake Default Audio Input', enableAudio: false});
            expect(chromeClient1Owner.videoState).to.equal(STATE.PLAY);
            expect(chromeClient1Owner.audioState).to.equal(STATE.PAUSE);
            await stopAudioVideo(chromeClient1Owner);
            expect(chromeClient1Owner.videoState).to.equal(STATE.STOP);
            expect(chromeClient1Owner.audioState).to.equal(STATE.STOP); 
            expect(chromeClient1Owner.screenState).to.equal(STATE.STOP);
        }).timeout(9000);

        //rtcLocked
        it('seleniumRoom:rtc user1 can create room rtcLocked', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room_locked', 'public');
            await changeRoomOptions(chromeClient1Owner, 'TEST_room_locked', 'auto', 8, false, false, true);
            room2Id = await getRoomId(chromeClient1Owner, 'TEST_room_locked');
        }).timeout(10000);
        //check in DB
        it('seleniumRoom:rtc check room1 in DB', async function(){
            const room = await request('/Room/'+room2Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_locked');
            expect(room.view_policy).to.equal('public');
            expect(room.rtcLocked).to.be.true;
        });

        it('seleniumRoom:rtc not logged in user can not enter in room', async function(){
            let url = WEB_URL + '/room/' + room2Id;
            let id = `${process.pid}`;
            guest1 = await createBrowserClient(id,url);
            await insertDisplayName(guest1, 'Guest');
            await checkRoomLocked(guest1);
            await guest1.close();
        }).timeout(7000);

    }
    if(debug5){
        it('seleniumRoom:rtc user1 can create room, showMoreOptions', async function(){
            await addConferenceRoom(chromeClient1Owner, 'TEST_room_moreOptions', 'public');
            room1Id = await getRoomId(chromeClient1Owner, 'TEST_room_moreOptions');
        }).timeout(7000);
        //check in DB
        it('seleniumRoom:rtc check room in DB, showMoreOptions', async function(){
            const room = await request('/Room/'+room1Id, 'GET', {}, {}, user1.token);
            expect(room.title).to.equal('TEST_room_moreOptions');
            expect(room.view_policy).to.equal('public');
        });

        it('seleniumRoom:rtc user1 can lock room', async function(){
            await showMoreOptions(chromeClient1Owner, {lockRoom: true});

            // not logged in user can not publish
            let url = WEB_URL + '/room/' + room1Id;
            let id = `${process.pid}`;
            guest1 = await createBrowserClient(id,url);
            await insertDisplayName(guest1, 'Guest');
            await checkRoomLocked(guest1);
            await guest1.close();

            // unlock room
            await showMoreOptions(chromeClient1Owner, {lockRoom: false});
        }).timeout(9000);
    }

});