let GameStatus = {start_dialog: 1, pause_dialog: 2, finish_dialog: 3, pause: 4, resume: 5, none: 0};
let ServerMessages = {started: 1, paused: 2, resumed: 3, finished: 4, ended: 5, sync: 6, shown_start_dialog: 7, canceled_start: 8, restart: 9};
let VirusStatus = {'move_to_link': 1, 'free_move': 2, 'rest': 3};

//http://soundimage.org/epic-battle/
let myGame = {
    score: 0,
    killedVirus: 0,
    createdVirus: 0,

    canvas: null,
    canvasId: 'web_invaders_game_canvas_div',
    links: [],

    maxVirus: 25,
    reSpan: 5,

    baseUrl: '',

    virus: [],
    bullets: [],
    bombs: [],

    escaped_virus: {},

    timer: 0,
    animationFrameId: 0,
    speed: 25,

    lastBulletFired: -15,
    bulletFireInterval: 15,

    rocket: null,

    port: null,

    status: GameStatus.none,

    scoreBoard: {
        body: undefined,
        score: undefined,
        killed: undefined,
        left: undefined
    },

    start : function() {
        this.reset();
        this.rocket = new Rocket();

        let t = myGame;

        let a = document.getElementsByTagName('a');
        for (let i = 0; i < a.length; i++) {
            let item = a[i];
            if (item.hostname === this.baseUrl) {
                let off = item.getBoundingClientRect();
                if (off.left || off.top)
                    t.links.push(item);
            }
        }

        this.escaped_virus[window.location.href] = 0;
        this.spanVirus(this.maxVirus, window.location.href);

        myGame.sendMessage(ServerMessages.started);

        this.status = GameStatus.playing;

        this.gameLoop();
    },

    spanVirus: function (count, url) {
        for (let i = 0; i<count; i+=6) {

            let v = new Virus(1, 1, url, this.canvas);
            this.virus.push(v);

            let v2 = new Virus(this.width - 55, 1, url, this.canvas);
            this.virus.push(v2);

            let v3 = new Virus(this.width/2, 1, url, this.canvas);
            this.virus.push(v3);

            let v4 = new Virus(1, this.height, url, this.canvas);
            this.virus.push(v4);

            let v5 = new Virus(this.width - 55, this.height, url, this.canvas);
            this.virus.push(v5);

            let v6 = new Virus(this.width/2, this.height, url, this.canvas);
            this.virus.push(v6);

            this.escaped_virus[window.location.href] += 6;
            this.createdVirus += 6;
        }
    },

    continue: function (game) {
        this.reset();
        this.rocket = new Rocket();

        let t = myGame;

        let l = Object.keys(game.virus);

        let a = document.getElementsByTagName('a');
        for (let i = 0; i < a.length; i++) {
            let item = a[i];
            if (item.hostname === game.baseUrl) {
                let off = item.getBoundingClientRect();
                if (off.left || off.top)
                    t.links.push(item);
            }

            if (l.includes(item.href) && game.virus[item.href]) {
                item.style.color = '#ff0000';
            }
        }

        let count = 0;
        if (game.virus[window.location.href])
            count = game.virus[window.location.href];

        myGame.escaped_virus = game.virus;
        myGame.score = game.score;
        myGame.createdVirus = game.createdVirus;
        myGame.killedVirus = game.killedVirus;

        for (let i = 0; i < count; i++) {
            let v = new Virus(random(1, this.width - 55), random(1, this.height - 55), window.location.href, this.canvas);
            this.virus.push(v);
        }

        this.spanVirus(this.reSpan, window.location.href);

        myGame.sendMessage(ServerMessages.started);

        this.status = GameStatus.playing;

        this.gameLoop();
    },

    reset: function () {
        this.width = document.body.clientWidth;
        this.height = document.body.clientHeight;

        this.links = [];
        this.virus = [];
        this.bullets = [];
        this.timer = 0;
        this.score = 0;
        this.killedVirus = 0;
        this.createdVirus = 0;
        this.lastBulletFired = -15;
        this.animationFrameId = 0;
        this.baseUrl = window.location.hostname;
    },

    onMessage: function (m) {
        switch (m.message) {
            case 'start':
                myGame.createGameElement();
                myGame.showGameStartDialog();
                break;
            case 'pause':
                myGame.pause();
                break;
            case 'continue':
                myGame.createGameElement();
                myGame.continue(m.game);
                break;
        }
    },

    createGameElement: function () {
        myGame.canvas = document.createElement(`div`);
        myGame.canvas.id = myGame.canvasId;
        document.body.appendChild(myGame.canvas);
        document.head.appendChild(toDOM(`<link rel="stylesheet" href="${browser.runtime.getURL("style.css")}">`));

        document.addEventListener("keyup", this.onKeyUp);
        document.addEventListener("resize", function () {
            this.width = document.body.clientWidth;
            this.height = document.body.clientHeight;
        });

        myGame.showScore();
    },

    onKeyUp: function (e) {
        if (e.which === 27) {
            switch (myGame.status) {
                case GameStatus.start_dialog:
                case GameStatus.finish_dialog:
                    myGame.close();
                    break;
                case GameStatus.playing:
                    myGame.pause();
                    break;
                case GameStatus.paused:
                case GameStatus.pause_dialog:
                    myGame.resume();
            }
        }
    },

    showGameStartDialog: function () {
        let dialog = `
<div id="web_invaders_game_start_dialog">
    <h6 class="game_name">WEB INVADERS</h6>
    <ul class="instruction">
        <li>Move the rocket using the mouse</li>
        <li>Shoot the Invaders with Left mouse click</li>
        <li>Invaders will move to the link. Open the and Follow the invaders and kill it.</li>
        <li>The link with invaders are shown in RED color</li>
    </ul>
    <p class="button">
        <a href="#" class="start">START</a>
        <a href="#" class="close">CANCEL</a>
    </p>
</div>`;

        let domDialog = toDOM(dialog);
        myGame.canvas.appendChild(domDialog);
        myGame.status = GameStatus.start_dialog;
        myGame.sendMessage(ServerMessages.shown_start_dialog);

        domDialog.getElementsByClassName('start')[0].addEventListener('click', function (e) {
            e.preventDefault();
            domDialog.remove();
            myGame.start();
        });

        domDialog.getElementsByClassName('close')[0].addEventListener('click', function (e) {
            e.preventDefault();
            myGame.close();
        });
    },

    showGameFinishDialog: function () {
        let dialog = `
<div id="web_invaders_game_finish_dialog">
    <h6 class="game_name">WEB INVADERS</h6>
    <h5 class="game_over">Game Over</h5>
    <h4 class="score">Score: <span>${myGame.score}</span></h4>
    <p class="button">
        <a href="#" class="start">RE-START</a>
        <a href="#" class="close">CLOSE</a>
    </p>
</div>`;

        let domDialog = toDOM(dialog);
        myGame.canvas.appendChild(domDialog);
        myGame.status = GameStatus.finish_dialog;

        domDialog.getElementsByClassName('start')[0].addEventListener('click', function (e) {
            e.preventDefault();
            domDialog.remove();
            myGame.restart();
        });

        domDialog.getElementsByClassName('close')[0].addEventListener('click', function (e) {
            e.preventDefault();
            domDialog.remove();
            myGame.close();
        });
    },

    showGamePausedDialog: function () {
        let dialog = `
<div id="web_invaders_game_pause_dialog">
    <h6 class="game_name">WEB INVADERS</h6>
    <h5 class="game_over">Paused</h5>
    <p class="button">
        <a href="#" class="start">RESUME</a>
        <a href="#" class="close">FINISH</a>
    </p>
</div>`;

        let domDialog = toDOM(dialog);
        myGame.canvas.appendChild(domDialog);
        myGame.status = GameStatus.pause_dialog;

        domDialog.getElementsByClassName('start')[0].addEventListener('click', function (e) {
            e.preventDefault();
            domDialog.remove();
            myGame.resume();
        });

        domDialog.getElementsByClassName('close')[0].addEventListener('click', function (e) {
            e.preventDefault();
            domDialog.remove();
            myGame.finish();
        });
    },

    showScore: function () {
        let dialog = `
<div id="web_invaders_game_score_dialog">
    <h1 class="game_name">WEB INVADERS</h1>
    <h4 class="info">Score: <span class="score">0</span></h4>
    <h5 class="info">Enemies Killed: <span class="killed">0</span></h5>
    <h6 class="info">Enemies Left: <span class="left">0</span></h6>
</div>`;

        let domDialog = toDOM(dialog);
        myGame.canvas.appendChild(domDialog);

        this.scoreBoard.score = domDialog.getElementsByClassName('score')[0];
        this.scoreBoard.killed = domDialog.getElementsByClassName('killed')[0];
        this.scoreBoard.left = domDialog.getElementsByClassName('left')[0];
    },

    updateScoreBoard: function () {
        this.scoreBoard.score.textContent = this.score;
        this.scoreBoard.killed.textContent = this.killedVirus;
        this.scoreBoard.left.textContent = this.createdVirus - this.killedVirus;
    },

    sendMessage: function (message) {
        this.port.postMessage({message: message});
    },

    shoot: function (x, y) {
        if (this.timer - this.lastBulletFired <= this.bulletFireInterval) return;

        let b = new Bomb(x - 5, y, this.canvas, 'bullet');
        myGame.bullets.push(b);
        this.lastBulletFired = this.timer;
    },

    render: function () {
        let t = this;
        let inactive_virus = [];
        let inactive_bullets = [];
        let inactive_bombs = [];

        let rect_m = this.rocket.getRect();

        this.virus.forEach(function (virus, index) {
            if (!virus.active) {
                if (virus.escapedTo) {
                    if (t.escaped_virus[virus.escapedTo]) {
                        t.escaped_virus[virus.escapedTo] ++;
                    }
                    else {
                        t.escaped_virus[virus.escapedTo] = 1;
                    }
                    t.escaped_virus[window.location.href] --;
                }

                inactive_virus.push(index);
                return;
            }

            if (t.rocket.active && rect_m.intersect(virus.getRect())) {
                this.score += virus.score;
                this.killedVirus ++;

                t.escaped_virus[window.location.href] --;

                virus.destroy();
                t.rocket.destroy();
                t.finish();
                return;
            }


      /*      if (Math.random() > 0.9 && Math.random() < 0.1 && Math.random() > 0.4 && Math.random() < 0.6 && Math.random() < 0.1) {
                let bomb = new Bomb(virus.x + virus.width /2, virus.y + virus.height, t.canvas, 'bomb');
                t.bombs.push(bomb);
            }*/

            virus.update();
        });

        inactive_virus.forEach(function (item) {
            t.virus.splice(item, 1);
        });

        this.bullets.forEach(function (bullet, index) {
            if (!bullet.active) {
                inactive_bullets.push(index);
                return;
            }

            let rect_b = bullet.getRect();

            t.virus.forEach(function (virus) {
                if (rect_b.intersect(virus.getRect())) {
                    t.score += virus.score;
                    t.killedVirus ++;

                    t.escaped_virus[window.location.href] --;

                    bullet.destroy();
                    virus.destroy();
                }
            });

            if (bullet.active)
                bullet.update();
        });

        inactive_bullets.forEach(function (item) {
            t.bullets.splice(item, 1);
        });

        /*this.bombs.forEach(function (bomb, index) {
            if (!bomb.active) {
                inactive_bombs.push(index);
                return;
            }

            if (bomb.getRect().intersect(t.rocket.getRect())) {
                bomb.destroy();
                t.rocket.destroy();
                t.finish();
                return;
            }

            if (bomb.active)
                bomb.update();
        });*/

        this.updateScoreBoard();
    },

    sync: function () {
        myGame.port.postMessage({message: ServerMessages.sync, game: {virus: myGame.escaped_virus, score: myGame.score, createdVirus: myGame.createdVirus, killedVirus: myGame.killedVirus, baseUrl: myGame.baseUrl}});
    },

    restart: function () {
        myGame.sendMessage(ServerMessages.restart);
    },

    close: function () {
        myGame.sendMessage(ServerMessages.ended);
        window.location.reload();
    },

    pause: function () {
        cancelAnimationFrame(myGame.animationFrameId);
        myGame.showGamePausedDialog();
        myGame.sendMessage(ServerMessages.paused);
    },

    resume: function () {
        myGame.status = GameStatus.playing;
        myGame.sendMessage(ServerMessages.resumed);
        myGame.gameLoop();
    },

    finish: function () {
        cancelAnimationFrame(myGame.animationFrameId);
        myGame.showGameFinishDialog();
        myGame.sendMessage(ServerMessages.finished);
    },

    gameLoop: function () {
        // l('loop');
        myGame.render();
        myGame.sync();
        myGame.timer ++;

        if (myGame.status === GameStatus.playing)
            myGame.animationFrameId = requestAnimationFrame(myGame.gameLoop);
    }
};

function Virus(x, y, url, canvas) {
    this.width = 55;
    this.height = 55;

    this.speedX = 4;
    this.speedY = 4;

    this.x = x;
    this.y = y;

    this.url = url;
    this.status = VirusStatus.rest;
    this.score = 10;
    this.active = true;
    this.escapedTo = false;

    this.timer = 0;
    this.rest_time = 0;

    this.mov_max_x = 500;
    this.mov_max_y = 500;

    this.rest_time_min = 100;
    this.rest_time_max = 200;

    this.movement = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        dx: 0,
        dy: 0,
    };

    this.body = toDOM(`<img src="${browser.runtime.getURL("/assets/images/virus-2.gif")}" style="position: absolute; z-index: 99999; width: ${this.width}px; height: ${this.height}px; top: ${this.y}px; left: ${this.x}px;">`);

    this.doc = {
        width: document.body.clientWidth,
        height: document.body.clientHeight
    };

    this.init = function () {
        canvas.appendChild(this.body);
    };

    this.init();

    this.update = function() {
        let m = this.movement;

        if (this.x < 0 || this.y < 0 || this.x > this.doc.width || this.y > this.doc.height) {
            this.makeDecision();
        }

        if (this.status === VirusStatus.rest) {
            if (this.timer === this.rest_time) {
                this.makeDecision();
            }
        }
        else {
            let xf = false;
            let yf = false;

            if (m.dx >= 0 && this.x >= m.x2) xf = true;
            else if (m.dx <= 0 && this.x <= m.x2) xf = true;

            if (m.dy >= 0 && this.y >= m.y2) yf = true;
            else if (m.dy <= 0 && this.y <= m.y2) yf = true;

            if (xf && yf) {
                if (this.status === VirusStatus.move_to_link) {
                    this.goInsideLink();
                }
                else {
                    this.makeDecision()
                }
            }
        }

        if (this.status !== VirusStatus.rest) {
            let Sin = Math.sin(this.movement.angle) * this.speedY;
            let Cos = Math.cos(this.movement.angle) * this.speedX;

            this.y += Sin;
            this.x += Cos;
        }

        this.timer ++;
        this.draw();
    };

    this.draw = function () {
        this.body.style.top = this.y + 'px';
        this.body.style.left = this.x + 'px';
    };

    this.randomXY = function () {
        let max_x, max_y, min_x, min_y;

        if (this.x + this.mov_max_x + this.width > this.doc.width) max_x = this.doc.width;
        else max_x = this.x + this.mov_max_x;

        if (this.x - this.mov_max_x - this.width < 0) min_x = 0;
        else min_x = this.x - this.mov_max_x;

        if (this.y + this.mov_max_y + this.height > this.doc.height) max_y = this.doc.height;
        else max_y = this.y + this.mov_max_y;

        if (this.y - this.mov_max_y - this.height < 0) min_y = 0;
        else min_y = this.y - this.mov_max_y;

        return{x: random(min_x + 1, max_x - 1), y: random(min_y + 1, max_y - 1)}
    };

    this.makeDecision = function () {
        let d = random(1, 100);

        if (d > 60) {
            this.takeRest();
        }
        else if (d > 40) {
            if (myGame.links) {
                let random_link = myGame.links[random(0, myGame.links.length - 1)];
                this.moveToLink(random_link);
            }
            else {
                let xy = this.randomXY();
                this.moveToXY(xy.x, xy.y);
            }
        }
        else {
            let xy = this.randomXY();
            this.moveToXY(xy.x, xy.y);
        }
    };

    this.moveToXY = function (x, y) {
        this.timer = 0;
        this.status = VirusStatus.free_move;
        this.movement = {
            x1: this.x,
            y1: this.y,
            x2: x,
            y2: y,
            dx: x - this.x,
            dy: y - this.y,
            angle: Math.atan2(y - this.y, x - this.x)
        }
    };

    this.moveToLink = function (link) {
        let pos = link.getBoundingClientRect();
        let x = pos.left + (link.clientWidth / 2);
        let y = pos.top + (link.clientHeight / 2);

        this.timer = 0;
        this.status = VirusStatus.move_to_link;
        this.movement = {
            x1: this.x,
            y1: this.y,
            x2: x,
            y2: y,
            dx: x - this.x,
            dy: y - this.y,
            angle: Math.atan2(y - this.y, x - this.x),
            link: link
        };
    };

    this.takeRest = function () {
        this.status = VirusStatus.rest;
        this.timer = 0;
        this.rest_time = random(this.rest_time_min, this.rest_time_max);
    };

    this.getRect = function () {
        return new Rect(this.x, this.y, this.x + this.width, this.y + this.height);
    };

    this.goInsideLink = function () {
        let m = this.movement;

        this.active = false;
        this.escapedTo = m.link.href;

        m.link.style.color = '#ff0000';
        this.fadeOut(function (virus) {
            virus.remove();
        })
    };

    this.fadeOut = function (callback) {
        let op = 1;
        let virus = this;
        let timer = setInterval(function () {
            if (op <= 0.1) {
                clearInterval(timer);
                virus.body.style.display = 'none';
                callback(virus.body)
            }
            virus.body.style.opacity = op;
            virus.body.style.filter = 'alpha(opacity=' + op * 100 + ")";
            op -= op * 0.2;
        }, 50);
    };

    this.destroy = function () {
        this.active = false;

        let virus = this;
        this.body.src = browser.runtime.getURL("/assets/images/explosion.gif");
        Sound.explosionVirus();
        setTimeout(function () {
            virus.body.remove();
        }, 800);
    }
}

function Bullet(x, y, canvas) {
    this.x = x;
    this.y = y;

    this.width = 10;
    this.height = 15;

    this.speedY = 2;

    this.active = true;

    this.body = toDOM(`<img src="${browser.runtime.getURL("/assets/images/bullet.png")}" style="position: absolute; z-index: 99999; width: ${this.width}px; height: ${this.height}px; top: ${this.y}px; left: ${this.x}px;">`);

    this.doc = {
        width: document.body.clientWidth,
        height: document.body.clientHeight
    };

    this.init = function () {
        canvas.appendChild(this.body);
        Sound.shoot();
    };

    this.init();

    this.update = function () {
        if (this.x < 0 || this.y < 0 || this.x > this.doc.width || this.y > this.doc.height) {
            this.destroy();
        }

        this.y -= this.speedY;
        this.draw();
    };

    this.draw = function () {
        this.body.style.top = this.y + 'px';
        this.body.style.left = this.x + 'px';
    };

    this.getRect = function () {
        return new Rect(this.x, this.y, this.x + this.width, this.y + this.height);
    };

    this.destroy = function () {
        this.active = false;
        this.body.remove();
    };
}

function Bomb(x, y, canvas, type) {
    this.x = x;
    this.y = y;

    this.width = 10;
    this.height = 15;

    this.speedY = 2;

    this.active = true;

    this.variation = {
        bullet: {
            speedY: 2,
            image: "/assets/images/bullet.png",
            sound: 'shoot',
            width: 10,
            height: 15
        },
        bomb: {
            speedY: -2,
            image: "/assets/images/bomb.png",
            sound: 'bomb',
            width: 15,
            height: 26
        }
    };

    this.doc = {
        width: document.body.clientWidth,
        height: document.body.clientHeight
    };


    this.init = function () {
        let bullet = this.variation[type];

        this.height = bullet.height;
        this.width = bullet.width;
        this.speedY = bullet.speedY;

        this.body = toDOM(`<img src="${browser.runtime.getURL(bullet.image)}" style="position: absolute; z-index: 99999; width: ${this.width}px; height: ${this.height}px; top: ${this.y}px; left: ${this.x}px;">`);

        canvas.appendChild(this.body);
        Sound[bullet.sound]();
    };

    this.init();

    this.update = function () {
        if (this.x < 0 || this.y < 0 || this.x > this.doc.width || this.y > this.doc.height) {
            this.destroy();
        }

        this.y -= this.speedY;
        this.draw();
    };

    this.draw = function () {
        this.body.style.top = this.y + 'px';
        this.body.style.left = this.x + 'px';
    };

    this.getRect = function () {
        return new Rect(this.x, this.y, this.x + this.width, this.y + this.height);
    };

    this.destroy = function () {
        this.active = false;
        this.body.remove();
    };
}

function Rocket() {
    this.x = 9999;
    this.y = 9999;

    this.width = 60;
    this.height = 75;

    this.activation_time = 5000; //millisecond
    this.active = false;

    this.init = function (rocket) {
        document.body.style.cursor = `url(${browser.runtime.getURL("/assets/images/rocket-inactive.png")}) 30 0, auto`;
        document.body.style.userSelect = 'none';
        document.body.style.MozUserSelect="none";

        setTimeout(function () {
            rocket.active = true;
            document.body.style.cursor = `url(${browser.runtime.getURL("/assets/images/rocket.png")}) 30 0, auto`;
        }, rocket.activation_time);

        this.onMouseDown = function (e) {
            myGame.shoot(e.pageX, e.pageY)
        };

        this.onMouseMove = function (e) {
            rocket.x = e.pageX;
            rocket.y = e.pageY;
        };

        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
    };

    this.init(this);

    this.remove = function () {
        document.body.style.cursor = 'auto';
        document.body.style.userSelect = 'auto';
        document.body.style.MozUserSelect="auto";
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mousemove', this.onMouseMove);
    };

    this.getRect = function () {
        return new Rect(this.x, this.y, this.x + this.width, this.y + this.height);
    };

    this.destroy = function () {
        document.body.style.cursor = `url(${browser.runtime.getURL("/assets/images/explosion.gif")}) 30 0, auto`;
        Sound.explosionRocket();
        let rocket = this;

        setTimeout(function () {
            rocket.remove();
        }, 800);
    }
}

function Rect(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;

    this.intersect = function (rect) {
        return !(rect.left > this.right ||
            rect.right < this.left ||
            rect.top > this.bottom ||
            rect.bottom < this.top);
    }
}

function random(min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function toDOM(html) {
    let div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
}

let Sound = {
    audio: true,
    background_audio: true,

    explosionRocket: function () {
        if (!this.audio) return;

        let audio = new Audio(browser.runtime.getURL("/assets/audio/explosion-1.mp3"));
        audio.play();
    },
    shoot: function () {
        if (!this.audio) return;

        let audio = new Audio(browser.runtime.getURL("/assets/audio/shoot.mp3"));
        audio.play();
    },
    explosionVirus: function () {
        if (!this.audio) return;

        let audio = new Audio(browser.runtime.getURL("/assets/audio/explosion.mp3"));
        audio.play();
    },
    bomb: function () {
        if (!this.audio) return;

        let audio = new Audio(browser.runtime.getURL("/assets/audio/shoot.mp3"));
        audio.play();
    }
};

browser.storage.local.get('settings').then(function (value) {
    let settings = value['settings'];

    myGame.maxVirus = settings.maxVirus;
    myGame.reSpan = settings.reSpan;
    Sound.audio = settings.audio;
});

myGame.port =  browser.runtime.connect({name: `port-from-cs}`});
myGame.port.onMessage.addListener(myGame.onMessage);

