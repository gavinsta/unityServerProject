const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const uuid = require('uuid');
const { WebSocketServer } = require('ws');
const { checkRoomForPlayerName, checkControllerAvailability, generateKey } = require('./helper');
const {
    port = 8080,
    SESS_SECRET = '$eCuRiTy',
} = process.env;
const app = express();

const rooms = [];
const Room = {
    roomCode: '',
    status: '',
    host: '',
    players: [],
    controllers: '',
    log: [],
    /**
 * Use a session id to return a player object in the room.
 * @param {string} id the generated uuid.v4
 * @returns the player object
 */
    findPlayerById(id) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                return this.players[i];
            }
        }
        return null;
    },
    /**
     * Use a player's name to return a player object in the room
     * @param {string} name the player name
     * @returns the player object
     */
    findPlayerByName(name) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].playerName == name) {
                return this.players[i];
            }
        }
        return null;
    },
    /**
     * Remove a player from the room by name
     * @param {String} playerName 
     */
    removePlayerByName(playerName) {
        if (this.players.length > 0) {
            for (var i = 0; i < this.players.length; i++) {
                if (this.players[i].playerName == playerName) {
                    this.players.splice(i, 1);
                    i--;
                }
            }
        }
    },
    /**
     * print all the controller keys of this room separated by new lines
     * @returns 
     */
    printControllerKeys() {
        let text = '';
        for (const key of this.controllers.keys()) {
            text += key + '\n';
        }
        return text;
    },
    /**
     * print all the controller keys of this room separated by new lines
     * @returns 
     */
    printControllerPairs() {
        let text = '';
        for (const key of this.controllers.keys()) {
            text += key + ' => ' + this.controllers.get(key) + '\n';
        }
        return text;
    },
    printPlayerNames() {
        let text = '';
        for (var i = 0; i < this.players.length; i++) {
            text += this.players[i].playerName + '\n';
        }
        return text;
    },
    /**
     * Returns the current stats of the room
     * @returns 
     */
    printStats() {
        const text = `Room Code: ${this.roomCode}\n`
            + `Players:\n${this.printPlayerNames()}`
            + `Controller Keys:\n${this.printControllerPairs()}`
            + `Log length: ${this.log.length}`;
        return text;
    }
}
const Host = {
    ws: '',
    id: '',
    status: '',
}
const wsid = new Map();
const idHost = new Map();
const idRoom = new Map();//map id to room object
const idPlayer = new Map();//map id to player object

//
// We need the same instance of the session parser in express and
// WebSocket server. Defaults to MemoryStore
//
const sessionParser = session({
    saveUninitialized: false,
    secret: SESS_SECRET,
    resave: false
});

//
// Serve static files from the 'webapp' folder.
//
app.use(express.static('../webapp'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(sessionParser);


app.post('/test', function (req, res) {
    console.log(`test was called with data: `);
    console.log(req.body);
    res.send(req.body);
});
app.post('/create', function (req, res) {
    if (req.session.userId && idRoom.has(req.session.userId)) {
        const id = req.session.userId;
        //this session is already hosting and did not close their last room! Consider reconnecting them?
        let message = `${id} is already hosting Room ${idRoom.get(id).roomCode}`;
        console.log(message);
        res.send({
            result: 'fail',
            status: 'duplicate_host',
            message: message
        });
        return;
    }

    /*
    ** CODE FOR TESTING (WHEN A KEY IS PROVIDED DURING THE REQUEST) **
    if (roomCode) {
        if (findRoomFromCode(roomCode)) {
            const message = `Tried to create room. Room ${roomCode} already exists.`;
            console.log(message);
            res.send({ message: message, result: 'fail', status: 'duplicate_roomCode' });

            return;
        }
    }
    */

    const { controllerKeys } = req.body;
    let tempRoomCode = generateKey(6);    //create a new roomCode
    while (isDuplicateRoomCode(tempRoomCode)) {
        tempRoomCode = generateKey(6);
    }
    const roomCode = tempRoomCode;
    //set an id for the host
    req.session.userId = uuid.v4();
    console.log(req.session.userId);
    const host = Object.create(Host);
    host.id = req.session.userId;
    const controllers = new Map();

    let controllerKeyList = [];
    //if there are keys provided
    if (controllerKeys) {
        controllerKeyList = controllerKeys;
    }

    //TODO REMOVE IN FINAL VERSION
    //substitute keys
    if (controllerKeyList.length === 0) {
        //create 4 stand-in keys
        for (var i = 0; i < 5; i++) {
            controllerKeyList.push(generateKey(5, false));
        }
    }

    //put all the keys into controllers list.
    for (var i = 0; i < controllerKeyList.length; i++) {
        controllers.set(controllerKeyList[i], '');
    }

    //creating a new room
    const room = Object.create(Room);
    room.controllers = controllers;
    room.roomCode = roomCode;
    room.host = host;
    rooms.push(room);
    //set the hostid -> room association
    idRoom.set(req.session.userId, room);
    idHost.set(req.session.userId, host);
    console.log(`Added new room: ${roomCode}.`);
    const message = 'Room: ' + roomCode.toString() + ' created!';
    res.send({ message: message.toString(), result: 'success', status: 'created', roomCode: roomCode });
});

app.post('/join', joinRoom);

function joinRoom(req, res) {
    //
    // Joins a Room and set userId to session.
    //
    console.log(req.body);
    const { roomCode, playerName } = req.body;
    if (roomCode) {
        const room = findRoomFromCode(roomCode);
        if (room) {
            console.log(`Found room with code: ${roomCode}. Current users: ${room.players.length}`);
            //check that a player with this name is not already in the room
            if (idPlayer.has(req.session.userId)) {
                console.error(`${playerName} already has a session.userId`);
                res.send({
                    result: 'fail',
                    message: `A connection with your userId already exists.`,
                    status: 'duplicate_session'
                });
                return;
            }

            if (checkRoomForPlayerName(room, playerName)) {
                res.send({
                    result: 'fail',
                    message: "A player with that name already exists",
                    status: 'duplicate_name'
                });
                console.log(`${playerName} already exists in room. Try a different name`)
                return;
            }

            req.session.userId = uuid.v4(); //assign a new unique id for the session
            req.session.save();//not sure if this is how it should be done...
            const player = {
                id: req.session.userId,
                playerName: playerName,
                controller: {
                    key: '',
                    status: 'none'
                },
                roomCode: roomCode,
                ws: '',
            }

            room.players.push(player);
            idPlayer.set(req.session.userId, player);
            idRoom.set(req.session.userId, findRoomFromCode(roomCode));
            const reply = 'Session updated: ' + playerName + ' joined room ' + roomCode + '.';
            res.send({
                result: 'success',
                message: reply,
                status: 'joined',
                log: room.log
            });
            console.log(`Updating session for user ${playerName}`);
            //console.log(room.printStats());
        }
        else {
            console.log(`No room: ${roomCode} found.`);
            res.send({
                result: 'fail',
                message: 'Could not find room. Create a Room before joining.',
                status: 'missing_room'
            });
        }
    }
}

app.post('/connect', function (req, res) {
    const { roomCode, playerName, controllerKey } = req.body;
    console.log(req.body);
    const room = findRoomFromCode(roomCode);
    const player = room.findPlayerByName(playerName);
    if (room.controllers)
        if (!player.ws) {
            console.error(`${playerName} is requesting to connect to a controller, but no WebSocket has been assigned.`);
            return;
        }
    console.log(`Room ${roomCode}: Connecting ${playerName} to controller...`)
    if (controllerKey) {
        if (!room.controllers.has(controllerKey)) {
            console.log(`Controller ${controllerKey} does not exist`);
            res.send({
                type: 'system',
                result: 'fail',
                status: 'bad_key',
                message: 'Controller does not exist.'
            })
            return;
        }
        if (player.controller.status == 'connected') {
            console.log(`${playerName} already has a controller: ${player.controller.key}!`)
            res.send({
                type: 'system',
                result: 'fail',
                status: 'has_controller',
                message: playerName + ' already has a controller: ' + player.controller.key
            });
            return;
        }
        //try setting a new controller
        if (checkControllerAvailability(room, controllerKey)) {
            room.controllers.set(controllerKey, playerName);
            player.controller.key = controllerKey;
            player.controller.status = 'connected';
            res.send({
                type: 'system',
                result: 'success',
                status: 'new_controller',
                message: 'Room ' + roomCode + ': ' + playerName + ' connected to controller ' + controllerKey
            });
            broadcast(room, `${playerName} connected to ${player.controller.key}`)
            return;
        }

        res.send({
            type: 'system',
            result: 'fail',
            status: 'unknown',
            message: `Controller ${controllerKey} already in use by ${room.controllers.get(controllerKey)}.`
        })
    }
});
app.delete('/connect', function (req, res) {
    const id = req.session.userId;
    disconnectController(id);
    res.send({
        result: 'success',
        message: 'Controller disconnected'
    });
});
/**
 * Disconnect a user from their controller using their session.userId
 * @param {SessionID} id 
 */
function disconnectController(id) {
    const player = idPlayer.get(id);
    const controllerKeyCopy = player.controller.key;
    const room = idRoom.get(id);
    room.controllers.set(player.controller.key, '');
    player.controller.key = '';
    player.controller.status = 'none';
    broadcast(room, `${player.playerName} disconnected from ${controllerKeyCopy}`);
}
app.delete('/leave', function (req, res) {

    const ws = idPlayer.get(req.session.userId).ws;

    req.session.destroy(function () {
        ws.close();

        res.send({ result: 'success', message: 'Left room' });
    });
});


/**
 * Closes a room based on its room code.
 * @param {roomCode} room 
 */
function close(room) {
    rooms = rooms.filter(key => key !== room);
}
//
// Create an HTTP server.
//
const server = http.createServer(app);

//
// Create a WebSocket server completely detached from the HTTP server.
//
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
    console.log(request);
    console.log(request.session);
    sessionParser(request, {}, () => {
        console.log('Parsing session request...');
        if (!request.session.userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            console.log('Session failed. Closing...')
            return;
        }

        const id = request.session.userId;
        const room = idRoom.get(id);
        if (idHost.has(id)) {
            console.log(`Session is parsed! New connection from Host Room: ${room.roomCode} \n==========`);
        }
        else if (idPlayer.has(id)) {
            const playerName = idPlayer.get(id).playerName;
            console.log(`Session is parsed! New connection from user ${playerName}\n==========`);
        }
        wss.handleUpgrade(request, socket, head, function (ws) {
            wss.emit('connection', ws, request);
        });
    });
});

wss.on('connection', function (ws, request) {
    const id = request.session.userId;
    if (checkIsHost(id)) {
        configureHostWebSocket(ws, request);
    }
    else {
        configurePlayerWebsocket(ws, request);
    }
});
function configureHostWebSocket(ws, request) {
    const id = request.session.userId;
    const host = idHost.get(id);
    host.ws = ws;
    wsid.set(ws, id);

    host.status = 'connected';
    const room = idRoom.get(id);
    const hostMessage = `Host connected on room ${room.roomCode}`
    broadcast(room, hostMessage);
    console.log(hostmessage);
    ws.on('message', function message(eventData) {
        const data = JSON.parse(eventData);
        const type = data.type;
        const room = findRoomFromCode(data.roomCode);
        if (!room) {
            console.warn(`Could not find Room: ${data.roomCode}`);
            return;
        }
        if (data.type == "chat") {
            sendChat(room, data);
        }
    });

    ws.on('close', function () {
        closeHostWebSocket(this);
    });
}
function closeHostWebSocket(ws) {
    const id = wsid.get(ws)
    const room = idRoom.get(id);//should return the room object
    //const player = idPlayer.get(id);

    idHost.delete(id);
    idRoom.delete(id);
    console.log(room.printStats());
    const message = `Host disconnected`;
    console.log(message);
    broadcast(room, message);
}
function configurePlayerWebsocket(ws, request) {
    const id = request.session.userId;
    idPlayer.get(id).ws = ws;

    wsid.set(ws, id);
    const room = idRoom.get(id);
    const joinMessage = idPlayer.get(id).playerName + " joined the room."
    broadcast(room, joinMessage);
    console.log(joinMessage);
    ws.on('message', function message(eventData) {
        const data = JSON.parse(eventData);
        const type = data.type;
        const room = findRoomFromCode(data.roomCode);
        if (!room) {
            console.warn(`Could not find Room: ${data.roomCode}`);
            return;
        }
        if (data.type == "chat") {
            sendChat(room, data);
        }
    });

    ws.on('close', function () {
        closePlayerWebSocket(this);
    });
}
function closePlayerWebSocket(ws) {
    const id = wsid.get(ws)
    const room = idRoom.get(id);//should return the room object
    const player = idPlayer.get(id);
    const playerName = player.playerName;//so we can keep using the name after the object is destroyed
    console.log(`Destroying session for ${playerName}`);
    if (player.controller.status == 'connected') {
        disconnectController(id);
    }
    room.removePlayerByName(playerName);
    console.log(`${playerName} disconnected from websocket.`);
    idPlayer.delete(id);
    idRoom.delete(id);
    console.log(room.printStats());
    broadcast(room, `${playerName} left the room.`)
}
wss.on('listening', () => {
    console.log('server is listening on port 8080');
});

//
// Start the server.
//
server.listen(port, function () {
    console.log(`Listening on http://localhost:${port}`);
});
function isDuplicateRoomCode(roomCode) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomCode == roomCode) {
            return true;
        }
    }
    return false;
}
/**
 * Find a room given its Room Code
 * @param {String} roomCode 
 * @returns the room object
 */
function findRoomFromCode(roomCode) {
    return rooms.find(room => room.roomCode === roomCode);
}
/**
 * Sends a chat message to the room
 * @param {Room Object} room the room object
 * @param {JS object} data the data in JS object format
 */
function sendChat(room, data) {
    const sender = data.sender ? data.sender : 'unknown sender';
    console.log(`Received message: "${data.message}" from user ${sender}`);

    //process data to return to chat
    const text = '[' + data.sender + ']' + ': ' + data.message;
    const stringified = JSON.stringify({
        type: "chat",
        sender: sender,
        message: text
    });
    for (var i = 0; i < room.players.length; i++) {
        const player = room.players[i];
        player.ws.send(stringified);
    }
    if (room.host.status == 'connected') room.host.ws.send(stringified)
}
/**
 * Send a String message to be displayed in the room's chat/log to everyone
 * @param {Object} room the room object
 * @param {string} message string message to be sent to everyone
 */
function broadcast(room, message) {
    const stringified = JSON.stringify({
        type: "chat",
        message: message
    });
    if (room && room.players) {
        for (var i = 0; i < room.players.length; i++) {
            const player = room.players[i];
            if (player.ws) {
                player.ws.send(stringified);
            }
        }
        room.log.push(message);
    }
    else {
        console.log(`Messaging room: ${roomCode}, but it doesn't seem to exist?`)
    }
}

function reportStats() {
    const text = `Total rooms: ${rooms.length}`;
    return text
}

function checkIsHost(id) {
    if (idHost.has(id)) {
        return true;
    }
    else return false;
}