RemotePlayer = function(index, game, player, startX, startY) {
    var x = startX;
    var y = startY;

    this.game = game;
    this.health = 3;
    this.player = player;
    this.alive = true;

    this.player = game.add.sprite(x, y, 'icons');
    this.player.frame = 1985;

    this.player.anchor.setTo(0.5, 0.5);

    this.player.name = index.toString();
    game.physics.enable(this.player, Phaser.Physics.ARCADE);

    this.player.body.immovable = true;
    this.player.body.collideWorldBounds = true;

    this.lastPosition = {x: x, y: y};
};

RemotePlayer.prototype.update = function() {
    if (this.player.x != this.lastPosition.x || this.player.y != this.lastPosition.y) {
        this.player.play('move');
        this.player.rotation = Math.PI + game.physics.arcade.angleToXY(this.player, this.lastPosition.x,
            this.lastPosition.y);
    }
    else {
        this.player.play('stop');
    }

    this.lastPosition.x = this.player.x;
    this.lastPosition.y = this.player.y;
};

var game = new Phaser.Game(1280, 720, Phaser.AUTO, '', {preload: preload, create: create,
    update: update, render: render}, false, false);

function preload() {
    game.load.image('earth', 'assets/light_sand.png');
    game.load.spritesheet('dude', 'assets/dude.png', 64, 64);
    game.load.spritesheet('enemy', 'assets/dude.png', 64, 64);
    game.load.spritesheet('icons', 'assets/tiles1.png', 32, 32);
    game.load.tilemap('level', 'assets/world.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles', 'assets/tiles1.png');
}

var socket;

var map;
var layer;

var player;

var enemies;

var currentSpeed = 0;
var cursors;

var tileTypes = {
    grass: 961,
    ocean: 1226,
    desert: 848,
    forest: 878,
    mountain: 872,
    river: 1254,
    dungeon: 983
};

var minimap;

function create() {
    socket = io('http://coltonoscopy.com:8120');

    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.refresh();
    game.world.setBounds(-500, -500, 1000, 1000);

    //land = game.add.tileSprite(0, 0, 800, 600, 'earth');
    //land.fixedToCamera = true;
    map = game.add.tilemap('level');
    map.addTilesetImage('tiles1', 'tiles');
    layer = map.createLayer('World1');
    layer.resizeWorld();
    layer.wrap = true;
    layer.fixedToCamera = true;
    layer.smoothed = false;
    layer.setScale(2);

    map.setCollision(tileTypes.grass, true, layer, true);

    var startX = Math.round(Math.random()*(1000)-500),
        startY = Math.round(Math.random()*(1000)-500);
    // player = game.add.sprite(startX, startY, 'dude');
    player = game.add.sprite(startX, startY, 'icons');
    player.frame = 1985;
    player.anchor.setTo(0.5, 0.5);
    // player.animations.add('move', [0,1,2,3,4,5,6,7], 20, true);
    // player.animations.add('stop', [3], 20, true);

    game.physics.enable(player, Phaser.Physics.ARCADE);

    player.body.maxVelocity.setTo(400, 400);
    player.body.collideWorldBounds = true;

    enemies = [];

    player.bringToTop();

    minimap = game.add.renderTexture(210, 140, 'minimap');
    minimap.renderXY(layer, 0, 0, true);
    minimapSprite = game.add.sprite(1000, 510, minimap);
    minimapSprite.fixedToCamera = true;
    minimapSprite.bringToTop();

    game.camera.follow(player);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

    cursors.left.onDown.add(function() {
        player.x -= 64;
    });

    cursors.right.onDown.add(function() {
        player.x += 64;
    });

    cursors.up.onDown.add(function() {
        player.y -= 64;
    });

    cursors.down.onDown.add(function() {
        player.y += 64;
    });

    setEventHandlers();
}

var setEventHandlers = function() {
    socket.on("connect", onSocketConnected);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("new player", onNewPlayer);
    socket.on("move player", onMovePlayer);
    socket.on("remove player", onRemovePlayer);
};

function onSocketConnected() {
    console.log("Connected to socket server");
    socket.emit("new player", {x: player.x, y:player.y});
}

function onSocketDisconnect() {
    console.log("Disconnected from socket server");
}

function onNewPlayer(data) {
    console.log("New player connected: " + data.id);

    enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y));
}

function onMovePlayer(data) {
    var movePlayer = playerById(data.id);

    if (!movePlayer) {
        console.log("Player not found: " + data.id);
        return;
    }

    movePlayer.player.x = data.x;
    movePlayer.player.y = data.y;
}

function onRemovePlayer(data) {
    var removePlayer = playerById(data.id);

    if (!removePlayer) {
        console.log("Player not found: " + data.id);
        return;
    }

    removePlayer.player.kill();

    enemies.splice(enemies.indexOf(removePlayer), 1);
}

function update() {
    game.physics.arcade.collide(player, layer);

    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) {
            enemies[i].update();
            game.physics.arcade.collide(player, enemies[i].player);
        }
    }

    layer.x = -game.camera.x;
    layer.y = -game.camera.y;

    socket.emit("move player", {x: player.x, y: player.y});
}

function render() {

}

function playerById(id) {
    var i;
    for (i = 0; i < enemies.length; i++) {
        if (enemies[i].player.name == id)
            return enemies[i];
    }

    return false;
}