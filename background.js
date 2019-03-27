

let GameStatus = {idle: 1, playing: 2, paused: 3, none: 4};
let ServerMessages = {started: 1, paused: 2, resumed: 3, finished: 4, ended: 5, sync: 6, shown_start_dialog: 7, canceled_start: 8, restart: 9};

let myApp = {
    game: null,
    tabId: null,
    port: null,
    status: GameStatus.none,
    audio: null,
    enableBackgroundAudio: true,

    onStartGame: function () {
        browser.tabs.query({active: true}).then(function (info) {
            let tabId = info[0]['id'];

            if (tabId === browser.tabs.TAB_ID_NONE && GameStatus.none !== myApp.status) {
                browser.tabs.update(tabId, {active: true});
                return;
            }
            else if (tabId === browser.tabs.TAB_ID_NONE) {
                return;
            }

            if (myApp.port) {
                if (myApp.status === GameStatus.none) {
                    myApp.startGame(tabId);
                }
                else {
                    if (tabId !== myApp.tabId) {
                        browser.tabs.update(tabId, {active: true});
                    }
                    else if (myApp.status === GameStatus.playing) {
                        myApp.port.postMessage({message: 'pause'})
                    }
                }
            }
            else {
                myApp.startGame(tabId);
            }
        });
    },

    injectScript: function (tabId) {
        browser.tabs.executeScript(tabId, {file: `game.js`}).then(function () {
            browser.tabs.insertCSS(tabId, {file: `style.css`});
        }, function () {
            myApp.closeGame();
        });

        myApp.tabId = tabId;
    },

    closeGame: function () {
        browser.webRequest.onHeadersReceived.removeListener(myApp.onReceivedHeader);
        browser.tabs.onUpdated.removeListener(myApp.onTabUpdated);
        myApp.game = null;
        myApp.tabId = null;
        myApp.status = GameStatus.none;
        badge.reset();
    },

    startGame: function (tabId) {
        myApp.tabId = tabId;
        browser.storage.local.get('settings').then(function (value) {myApp.enableBackgroundAudio = value.settings.background;});
        browser.webRequest.onHeadersReceived.addListener(myApp.onReceivedHeader, {tabId: tabId, urls: ['<all_urls>']}, ['blocking', 'responseHeaders']);
        browser.tabs.onUpdated.addListener(myApp.onTabUpdated);
        browser.tabs.reload( tabId, {bypassCache: true});
        badge.loading(tabId);
    },

    playBackgroundMusic: function () {
        if (!this.audio) {
            myApp.audio = new Audio(browser.runtime.getURL("/assets/audio/background.mp3"));
            myApp.audio.loop = true;
        }

        if (myApp.enableBackgroundAudio)
            this.audio.play();
    },

    stopBackgroundMusic: function () {
        if (this.audio)
            this.audio.pause();
    },

    onReceivedHeader: function (details) {
        details.responseHeaders.push({name: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate, no-store'});
        return {responseHeaders: details.responseHeaders};
    },

    onTabUpdated: function (tabId, changeInfo) {
        if (tabId === myApp.tabId && changeInfo.status && changeInfo.status === 'complete') {
            myApp.status = GameStatus.none;
            myApp.injectScript(tabId);
        }
    },

    onConnected: function (port) {
        myApp.port = port;

        if (myApp.game) {
            port.postMessage({message: 'continue', game: {virus: myApp.game.virus, score: myApp.game.score, baseUrl: myApp.game.baseUrl}}); }
        else
            port.postMessage({message: 'start'});

        myApp.tabId = port.sender.tab.id;
        port.onMessage.addListener(myApp.onMessage);
        port.onDisconnect.addListener(myApp.onDisconnect);
        badge.playing(myApp.tabId);
    },

    onDisconnect: function (port) {
        myApp.port = null;
    },

    onMessage: function (m) {
        switch (m.message) {
            case ServerMessages.sync:
                myApp.game = m.game;
                break;
            case ServerMessages.shown_start_dialog:
                myApp.status = GameStatus.idle;
                break;
            case ServerMessages.canceled_start:
                myApp.closeGame();
                break;
            case ServerMessages.started:
                badge.playing(myApp.tabId);
                myApp.playBackgroundMusic();
                myApp.status = GameStatus.playing;
                break;
            case ServerMessages.paused:
                badge.paused(myApp.tabId);
                myApp.stopBackgroundMusic();
                myApp.status = GameStatus.paused;
                break;
            case ServerMessages.resumed:
                badge.playing(myApp.tabId);
                myApp.playBackgroundMusic();
                myApp.status = GameStatus.playing;
                break;
            case ServerMessages.finished:
                myApp.stopBackgroundMusic();
                myApp.status = GameStatus.idle;
                break;
            case ServerMessages.ended:
                myApp.stopBackgroundMusic();
                myApp.closeGame();
                break;
            case ServerMessages.restart:
                myApp.stopBackgroundMusic();
                myApp.status = GameStatus.none;
                myApp.game = null;
                browser.tabs.reload(myApp.tabId, {bypassCache: true});
                break;
        }
    },

    onInstalled: function () {
        let settings = {
            'maxVirus': 20,
            'reSpan': 5,
            'audio': true,
            'background': true
        };
        browser.storage.local.set({settings: settings}).then();
    }
};

let badge = {
    loading: function (tabId) {
        browser.browserAction.setBadgeText({text: '✽'}).then(function () {
            browser.browserAction.setBadgeBackgroundColor({color: '#ff0000'}).then(function () {
                browser.browserAction.setTitle({title: 'Web Invaders - Loading'}).then();
            });
        });
    },

    playing: function (tabId) {
        browser.browserAction.setBadgeText({text: '⯈', tabId: tabId}).then(function () {
            browser.browserAction.setBadgeBackgroundColor({color: '#00ca3f', tabId: tabId}).then(function () {
                browser.browserAction.setTitle({title: 'Web Invaders - Online', tabId: tabId}).then();
            });
        });
    },

    paused: function (tabId) {
        browser.browserAction.setBadgeText({text: '⏸', tabId: tabId}).then(function () {
            browser.browserAction.setBadgeBackgroundColor({color: '#FF7300', tabId: tabId}).then(function () {
                browser.browserAction.setTitle({title: 'Web Invaders - Paused', tabId: tabId}).then();
            });
        });
    },

    reset: function () {
        browser.browserAction.setBadgeText({text: ''}).then(function () {
            browser.browserAction.setBadgeBackgroundColor({color: null}).then(function () {
                browser.browserAction.setTitle({title: 'Web Invaders'}).then(null);
            });
        });
    }
};

browser.runtime.onConnect.addListener(myApp.onConnected);
browser.browserAction.onClicked.addListener(myApp.onStartGame);
browser.runtime.onInstalled.addListener(myApp.onInstalled);

