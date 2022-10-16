'use strict'
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const uuid = require('uuid');
const { WebSocketServer, WebSocket } = require('ws');
const { generateKey } = require('./helper');
const { json } = require('body-parser');
const { format } = require('path');
const {
    port = 8080,
    SESS_SECRET = '$eCuRiTy',
} = process.env;
const app = express();
const timeOutDuration = 1000 * 60 * 3;//3 minutes
/** Room objects hold controllerKeys, controllers, hosts, players, etc 
 * and supporting functions
 */
class Room {
    /**
     * Construct a new room
     * @param {string} roomCode 
     * @param {Array<String>} controllers array of controller keys
     */
    constructor(roomCode, controllers) {
        this.roomCode = roomCode;
        this.host = new Host();
        this.players = [];
        if (controllers && controllers.length > 0) {
            this.controllers = new Map(controllers.map(x => [x, '']),);
            this.choiceContexts = new Map(controllers.map(x => [x, '']),);
        }
        else {
            this.controllers = new Map();
            this.choiceContexts = new Map();
        }
        this.log = [];

    }
    /**The room code of the room */
    roomCode;
    /** The status of the room. Should include all things we might need statuses on */
    status = {
        general: "open",
        input: "pending",
    };

    /** Host object */
    host;
    /**Array of players */
    players;
    /**Map of controllers to player objects*/
    controllers;
    /**Settings object for the Room Object */
    settings = {
        //TODO implement settings
        messageSettings: {
            saveChatMessages: true,
            saveSystemMessages: true,
            saveLogMessages: true,
        },
        /**private, public, etc.*/
        privacySettings: "public"
    };
    /** Chat and message log of the room */
    log;
    gameContext = {};
    /**Map of players to their choice contexts*/
    choiceContexts;
    /**Reference to timeout if room is scheduled to close */
    timer;
    /**
     * Returns an integer by default of all the players in the game. 
     * @param {bool} names If names = true, will isntead return
     */
    countActivePlayers(names = false) {
        if (names) {

        }
        else return this.players.length;
    }
    /**
    * Use a WebSocket id to return a player object in the room.
    * @param {string} id the generated uuid.v4
    * @returns {Player} the player object
    */
    findPlayerById(id) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                return this.players[i];
            }
        }
        return null;
    }
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
    }

    getPlayerControllerKey(name) {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].playerName == name) {
                const key = this.players[i].controller.key;
                if (key) return key;
            }
        }
        return null;
    }
    /**
    * Check if the room contains a player with this name already
    * @param {String} name Player's playerName attribute
    * @returns 
    */
    checkForPlayerName(name) {
        if (this.players.length < 1) {
            return false;
        }
        for (var i = 0, len = room.players.length; i < len; i++) {
            if (room.players[i].playerName === name) {
                //player name is in room
                return true;
            }
        };
        return false;
    }
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
    }
    /**
     * Remove a player from the room by name
     * @param {String} id 
     */
    removePlayerByID(id) {
        if (this.players.length > 0) {
            for (var i = 0; i < this.players.length; i++) {
                if (this.players[i].id == id) {
                    this.players.splice(i, 1);
                    i--;
                }
            }
        }
    }
    /**
     * check if the controller key is 'available'
     * @param {String} controllerKey the controller key
     * @returns 
     */
    checkControllerAvailability(controllerKey) {
        //check that this is a key already added into the room
        if (this.controllers.has(controllerKey)) {
            console.log(`Room: ${this.roomCode} has controller with key: ${controllerKey}`)
            if (this.controllers.get(controllerKey) == '') return true
        }
        else {
            console.log(`Room ${this.roomCode} does not have controller with key: ${controllerKey}`);
        }
        return false;
    }
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
    }
    /**
     * print all the controller keys of this room separated by new lines
     * @returns 
     */
    printControllerPairs() {
        let text = '';
        for (const key of this.controllers.keys()) {
            text += key + ' => ' + this.controllers.get(key).playerName + '\n';
        }
        return text;
    }
    printPlayerNames() {
        let text = '';
        for (var i = 0; i < this.players.length; i++) {
            text += this.players[i].playerName + '\n';
        }
        return text;
    }
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
    getStats() {
        const data = {
            roomCode: this.roomCode,
            players: [this.players],
            controllers: this.controllers,
        }
    }
    /**
    * A new websocket has connected to the host of this session
    * @param {WebSocket} ws 
    */
    connectHost(ws) {
        this.host.connect(ws);
        const connectMessage = `Host connected to room ${this.roomCode}`;
        broadcast(this, connectMessage);
        console.log(connectMessage);
        this.roomTimeOut(false);
    }
    /**
     * Disconnects the current host of this room.
     */
    disconnectHost() {
        this.host.disconnect();
        const disconnectMessage = `Host disconnected from room ${this.roomCode}. Timeout countdown begun: `;

        broadcast(this, disconnectMessage);
        console.log(disconnectMessage);
        this.roomTimeOut(true);
    }
    /**
     * Closes the room after time has passed (designated by {timeOutDuration}). Can be interrupted by providing "false" as the parameter
     * @param {Boolean} start if true: starts the timer, if false: stops it.
     */
    roomTimeOut(start) {
        if (start && !this.timer) {
            this.timer = setTimeout(() => {
                this.status.general = "closed";
            }, timeOutDuration);
        }
        else if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Connect (really we are just saving the association) a Websocket ID to a controller.
     * @param {String} id the WebSocket ID assigned on connection
     * @param {String} controllerKey the string key you are trying to connect to
     * @returns a status object
     */
    connectController(id, controllerKey) {
        const player = this.findPlayerById(id);
        const result = {
            status: 'fail',
            text: 'Key Unavailable.'
        }
        console.log(`Room ${this.roomCode}: Connecting ${player.playerName} to controller ${controllerKey}...`)
        if (controllerKey) {
            if (!this.controllers.has(controllerKey)) {
                result.text = `Controller ${controllerKey} does not exist in Room: ${this.roomCode}`;
                return result;
            }
            if (player.controller.status == 'connected') {
                result.text = `${player.playerName} already has a controller: ${player.controller.key}!`;
                return result;
            }
            //try setting a new controller
            if (this.checkControllerAvailability(controllerKey)) {
                this.controllers.set(controllerKey, player);
                player.assignController(controllerKey);
                result.status = 'connected';
                result.text = `Room ${this.roomCode}: ${player.playerName} connected to controller: ${controllerKey}`;

                return result;
            }
            else return result;
        }
        else return result;
    }
    /**
     * Disconnects a WebSocket ID's player from the web controller
     * @param {String} id WebSocket ID of the player controller we are disconnecting
     */
    disconnectController(id) {
        const player = this.findPlayerById(id);
        const controllerKey = player.controller.key;
        if (this.controllers.has(controllerKey)) {
            this.controllers.set(controllerKey, '');
        }
        player.unassignController();
        const text = `${player.playerName} disconnected from ${controllerKey}`;
        broadcast(this, text);
        return { status: "disconnected", text: text }
    }
    /**
     * Send a log to the room
     * @param {object} fullMessage text message
     */
    newLog(fullMessage) {
        //process data to return to chat
        const { sender, text } = fullMessage;
        //console.log(sender == 'host' ? `[HOST]: ${text}` : `[${sender}]: ${text}`);
        fullMessage.time = new Date();
        this.log.push(fullMessage);
        const fullLogMessage = {
            type: 'FULL_LOG',
            sender: 'server',
        }
        if (this.host.status == 'connected') { sendWSMessage(this.host.ws, fullLogMessage, this.log) }
        for (var i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            sendWSMessage(player.ws, fullLogMessage, this.log);

        }
    }
    /**
     * Parse the GameContext data from a WebSocket message
     * @param {Object} WSmessage 
     */
    parseGameContext(WSmessage) {
        this.gameContext = JSON.parse(WSmessage.data);
        this.updateGameContext();
    }

    updateGameContext() {
        if (this.gameContext != null) {
            for (var i = 0; i < this.players.length; i++) {
                const player = this.players[i];
                const message = {
                    type: "UPDATE",
                    header: "game_context",
                    sender: "server"
                }
                sendWSMessage(player.ws, message, this.gameContext);
            }
        }
    }
    /** Receive a player choice context and then send it to that player */
    parsePlayerChoiceContext(WSmessage) {
        const choiceContext = JSON.parse(WSmessage.data);
        console.log(choiceContext)
        const controllerKey = choiceContext.controllerKey;
        if (!controllerKey) {
            let text = `Received a choice context from ${WSmessage.sender} with no controller key.`
            console.warn(text);
            return;
        }
        else {
            this.choiceContexts.set(controllerKey, choiceContext);
            if (this.controllers.get(controllerKey)) {
                const player = this.controllers.get(controllerKey);
                const message = {
                    type: "UPDATE",
                    header: "choice_context",
                    sender: "server"
                }
                sendWSMessage(player.ws, message, choiceContext);
            }
        }
    }
    /**
     * Updates the player choice contexts for all players
     */
    updatePlayerChoiceContext() {
        const message = {
            type: "UPDATE",
            header: "choice_context",
            sender: "server"
        }
        this.controllers.forEach((player, key) => {
            const context = this.choiceContexts.get(key);
            sendWSMessage(player.ws, message, context);
        });
    }
    /**
     * Updates the player choice context for a sepcific player
     * @param {Player} player 
     */
    updatePlayerChoiceContext(player) {
        console.log(`${player.playerName} has key: ${player.controller.key}`)
        if (player.controller.key) {

            const controllerKey = player.controller.key;
            const context = this.choiceContexts.get(controllerKey);
            const message = {
                type: "UPDATE",
                header: "choice_context",
                sender: "server"
            }
            sendWSMessage(player.ws, message, context);
        }
    }

    updatePlayerSelectedChoice(player, choice) {
        this.currentSelectedChoices.set(player, choice);
        //run a quick check to see if we still need more player choices
        if (this.currentSelectedChoices.size == this.countActivePlayers()) {
            //send the choices off!
            //TODO we will eventually put some logic here in case only certain players at a time can make a decision/choice
            this.sendCurrentChoices();
        }
    }

    sendCurrentChoices() {
        const message = {
            type: "COMMAND",
            header: "choices",
        }
        let choices = [];
        this.currentSelectedChoices.forEach((val, key) => {
            choices.push(val);
        })
        const bundledChoices = {
            prompt: 'none',
            choices: choices,
        }
        sendWSMessage(this.host.ws, message, bundledChoices);
    }
    currentSelectedChoices = new Map();
}
/** Class for managing the Unity Host Object of rooms  (and connections) */
class Host {
    ws;
    id;
    status;
    /**
     * Connects the Host to a new websocket
     * @param {WebSocket} ws 
     */
    connect(ws) {
        this.ws = ws;
        if (ws.id) {
            this.id = ws.id;
        }
        this.status = 'connected'
    }
    /**Disconnects the current host's connection */
    disconnect() {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        this.ws = '';
        this.id = ''
        this.status = 'no connection'
    }
}
/**
 * Player object class.
 */
class Player {
    /**
     * 
     * @param {WebSocket} ws 
     * @param {String} playerName 
     * @param {String} roomCode 
     */
    constructor(ws, playerName, roomCode) {

        this.playerName = playerName;
        this.roomCode = roomCode;
        this.controller = {
            key: '',
            status: 'none'
        };
        this.connectWebSocket(ws);
    }

    playerName;
    /**The WebSocket connetion of this Player object */
    ws;
    id;

    /**
     * Assign a controller key to the Player Object
     * @param {String} controllerKey 
     */
    assignController(controllerKey) {
        this.controller.key = controllerKey;
        this.controller.status = 'connected';
    }
    unassignController() {
        this.controller.key = '';
        this.controller.status = 'none';
    }
    /**
     * Connect the player object to the websocket
     * @param {WebSocket} ws 
     */
    connectWebSocket(ws) {
        this.ws = ws;
        this.id = ws.id;
        idPlayer.set(ws.id, this);
    }
    /**
     * Disconnects the player through the websocket
     */
    disconnectWebSocket() {

        idPlayer.delete(id);
        this.ws = null;
        this.id = null;
    }
}
const rooms = [];

const idws = new Map();
/** Returns a Room object from a WebSocket ID*/
const idRoom = new Map();//map id to room object
/**Returns a Player object from a WebSocket ID */
const idPlayer = new Map();//map id to player object

const serverSettings = {
    roomCodeLength: 6,
    keyLength: 5,
    keyRandom: false,
}
//
// Serve static files from the 'webapp' folder.
//
//app.use(express.static('../webapp_ws'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
/**
 * 
 * @param {WebSocket} ws host websocket
 * @param {URLencodedString} controllerKeyString the url-encoded query string directly from the create-room connection request
 * @param {String} roomCode default none | can provide one for testing purposes or if we want a very unique identifier
 */
async function createNewRoom(ws, controllerKeyString, roomCode) {
    const id = ws.id;
    /** assign a room code **/
    let assignedRoomCode
    if (checkValidRoomCode(roomCode)) {
        assignedRoomCode = roomCode;
    }
    else {
        assignedRoomCode = generateKey(serverSettings.keyLength);
        while (!checkValidRoomCode(assignedRoomCode)) {
            assignedRoomCode = generateKey(serverSettings.keyLength);
        }
    }

    let controllerKeyList = JSON.parse(controllerKeyString);
    //substitute keys if none are provided
    if (controllerKeyList === undefined || controllerKeyList.length === 0) {
        //generate 4 stand-in keys
        for (var i = 0; i < 5; i++) {
            controllerKeyList.push(generateKey(serverSettings.keyLength, serverSettings.keyRandom));
        }
    }

    //creating a new room
    const room = new Room(assignedRoomCode, controllerKeyList);
    room.connectHost(ws);
    rooms.push(room);

    //set the id -> room association
    idRoom.set(id, room);

    //send a confirmation message to the host
    const text = `Added new room: ${assignedRoomCode}.`;
    console.log(text);
    const data = {
        roomCode: assignedRoomCode,
        status: 'open',
        controllerKeys: controllerKeyList,
        text: room.printStats()
    }
    const message = {
        type: 'SERVER_MESSAGE',
        header: 'new_room',
        sender: 'server',
        text: text,
    }
    sendWSMessage(ws, message, data);
}
async function createTestRoom() {
    const id = 'testing';
    /** assign a room code **/
    let assignedRoomCode = 'TESTER'

    let controllerKeyList = [];
    for (var i = 0; i < 5; i++) {
        const key = Array(5).fill(i);
        controllerKeyList.push(key.join(""));
    }

    //creating a new room
    const room = new Room(assignedRoomCode, controllerKeyList);
    rooms.push(room);

    //set the id -> room association
    idRoom.set(id, room);

    //send a confirmation message to the host

    console.log(`Test room opened: ${assignedRoomCode}.`);

    console.log(`Filling log with test messages`);
    for (i = 0; i < 5; i++) {
        const testChat = {
            type: 'CHAT',
            sender: i % 2 == 0 ? 'A' : 'B',
            text: `testing chat #${i + 1}`
        }
        const testLog = {
            type: 'CHAT',
            sender: i % 2 == 0 ? 'B' : 'A',
            text: `testing log #${i + 1}`
        }
        room.log.push(testChat);
        room.log.push(testLog);
    }
}
/**
 * Join a room that is already open with the current player's name and websocket
 * @param {WebSocket} ws Websocket connection
 * @param {Room} room Room to join
 * @param {String} playerName player's name
 */
function joinRoom(ws, room, playerName) {
    //
    // Joins a Room and set all the references
    //
    const id = ws.id;
    console.log(`${playerName} joining room ${room.roomCode} with ID: ${id}`);
    //check that this ws id is not already connected to something
    if (idPlayer.has(id)) {
        const errorText = `WebSocket ID already in use by ${idPlayer.get(id).playerName}. Check that this Player is properly disconnected.\nClosing Connection.`;
        sendErrorMessage(ws, errorText, 'fail', 'failed to join');
        ws.close();
        return;
    }

    const existingPlayer = room.findPlayerByName(playerName);
    if (existingPlayer) {
        if (existingPlayer.ws.readyState === WebSocket.OPEN) {
            //player exists and is connected...
            const errorText = `${playerName} already exists in room ${room.roomCode}. Try a different name.\nClosing Connection.`;
            sendErrorMessage(ws, errorText);
            ws.close();
            return;
        }
        else {
            //player exists but isn't connected: reconnect the player
            const text = `${playerName} is already in ${room.roomCode}.\nConnecting new WebSocket to player.`;
            existingPlayer.connectWebSocket(ws);
            console.log(text);
        }
    }
    else {
        //create a new player!
        const player = new Player(ws, playerName, room.roomCode);
        room.players.push(player);
        idRoom.set(id, room);

        const text = `Session updated: ${playerName} joined room ${room.roomCode}.`;
        broadcast(room, text);
    }


}

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
    console.log('Parsing connection request...');
    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', function (ws, request) {
    const queryString = request.url.split('?')[1];
    console.log(`querying: ${queryString}`);
    const urlParams = new URLSearchParams(queryString);
    var message = '';

    //check for id already
    if (ws.id) {
        //should never be the case...
        message = `New websocket already has ID ${idws.get(ws)}`;
        console.warn(message);
        ws.close();
        return;
    }
    const id = uuid.v4(); //assign a new unique id for this ws
    ws.id = id;
    if (urlParams.has('host')) {
        //url/?host=#ROOMCODE&controllerKeys
        const roomCode = urlParams.get('host');
        const room = findRoomFromCode(roomCode);
        //there was already a room created before...
        if (room) {
            if (room.host.ws && room.host.status == 'connected') {
                message = `The room is already being hosted by ${room.host.id}`;
                ws.close();
                return;
            }
            else {
                //reconnect host
                configureHostWebSocket(ws);
                room.host.connectHost(ws);
            }
        }
        else {
            //this is a host, without a room! create a new room!
            createNewRoom(ws, urlParams.get('controllerKeys'));
            configureHostWebSocket(ws);
        }
        console.warn(message);
    }
    else if (urlParams.has('join') && urlParams.has('name')) {
        const roomCode = urlParams.get('join');
        const playerName = urlParams.get('name');
        const room = findRoomFromCode(roomCode);
        if (room) {
            joinRoom(ws, room, playerName);
            configurePlayerWebsocket(ws);
        }
        else {
            const errorText = `Could not find Room: ${roomCode}. Closing connection.`
            sendErrorMessage(ws, errorText);
            ws.close();
            return;
        }
    }
    else {
        const errorText = "Unrecognized connection. Closing.";
        sendErrorMessage(ws, errorText);
        ws.close();
        return;
    }

    //if we decide to keep the connection...
    idws.set(id, ws);//easily find the ws from id
    //test the connection
    ws.ping();
});
/* TODO set up an interval ping that checks every five minutes if hosts are still connected to the rooms. Otherwise, start a timeout to close the room.
* forreach room in rooms: host.ws.ping() to see if it is still alive
*/

function configureHostWebSocket(ws) {
    ws.on('pong', function heartbeat() {
        this.isAlive = true;
        console.log(`Received pong from: ${this.id}`);
        return;
    });
    ws.on('message', function message(eventData) {
        const message = JSON.parse(eventData);
        handleHostWSMessage(message, ws);
    });

    ws.on('close', function () {
        onCloseHostWebSocket(this);
    });
    function handleHostWSMessage(message, ws) {
        const room = idRoom.get(ws.id);
        if (!room) {
            console.warn(`Could not find Room: ${message.roomCode} to send message to.`);
            return;
        }
        if (message.type == "CHAT" || message.type == "LOG") {
            message.sender = "host";
            room.newLog(message);
            console.log(`received message: ${message.text}`)
            return;
        }
        if (message.type == "HOST") {
            room.newLog(message);
            return;
        }
        if (message.type == "GAME_CONTEXT") {
            room.parseGameContext(message);
            return;
        }
        if (message.type == "CHOICE_CONTEXT") {
            room.parsePlayerChoiceContext(message);
        }
    }

}

/**
 * 
 * @param {WebSocket} ws 
 */
function configurePlayerWebsocket(ws) {
    ws.on('message', (eventData) => {
        const message = JSON.parse(eventData);
        const room = getRoomFromID(ws.id);
        if (!room) {
            console.error(`Could not find Room for id: ${ws.id}`);
            return;
        }
        if (message.type == 'CHAT' || message.type == 'LOG') {
            room.newLog(message);
            return;
        }
        if (message.type == 'COMMAND') {
            //TODO send certain commands to Unity
            if (message.header == 'get_room_stats') {
                this.send(JSON.stringify({
                    type: 'SERVER',
                    header: 'room_stats',
                    data: room.printStats(),
                }));
                return;
            }
            parseClientCommand(message, ws);
        }
        if (message.type = "REQUEST") {
            parseClientRequest(message, ws);
        }
    });
    ws.on('close', function () {
        onClosePlayerWebSocket(this);
    });
}
function parseClientCommand(WSMessage, ws) {
    const { header, data } = WSMessage
    const room = idRoom.get(ws.id);
    const response = {}
    switch (header) {
        case "choice":
            if (!data) {
                response.type = "SERVER";
                response.header = "error";
                response.text = 'Could not find data for submitted choice'
                break;
            }
            else {
                const choice = JSON.parse(data);
                console.log(`Received Choice!`)
                console.log(choice);
                room.updatePlayerSelectedChoice(idPlayer.get(ws.id), choice)
            }
            break;
    }

    sendWSMessage(ws, response, null, true);
}
/**
 * 
 * @param {Object} WSMessage 
 * @param {WebSocket} ws 
 * @param {Room} room
 */
function parseClientRequest(WSMessage, ws) {
    const room = idRoom.get(ws.id);
    if (!room) {
        console.error(`Could not find room for ${idPlayer.get(ws.id).playerName}`);
        return;
    }
    const message = {
        type: "UPDATE",
        header: "",
        sender: "server",
    }
    let data = null;
    let result = { status: "", text: "" }
    switch (WSMessage.header) {
        case "game_context":
            message.header = WSMessage.header;
            data = room.gameContext;

            //NOTE when we update game_context, we will automatiicaly send choice context as well
            room.updatePlayerChoiceContext(idPlayer.get(ws.id));
            break;
        case "controller_connection":
            const controllerKey = WSMessage.controllerKey ? WSMessage.controllerKey : '';
            if (controllerKey == '') {
                result.status = "fail";
                result.text = "No controller key attached to controller connect request";
                break;
            }

            result = room.connectController(ws.id, controllerKey)
            console.log(`${result.status}: ${result.text}`)
            message.header = WSMessage.header;
            message.status = result.status;
            message.text = result.text;
            sendWSMessage(ws, message);
            room.updatePlayerChoiceContext(idPlayer.get(ws.id));
            break;
        case "controller_disconnection":
            result = room.disconnectController(ws.id);
            message.status = result.status;
            message.text = result.text;
            message.header = "controller_connection"
            break;
    }
    sendWSMessage(ws, message, data)
}
/**
 * 
 * @param {WebSocket} ws 
 */
function onClosePlayerWebSocket(ws) {
    const id = ws.id;
    const room = getRoomFromID(id);//should return the room object
    const player = idPlayer.get(id);
    if (player) {
        const playerName = player.playerName;//so we can keep using the name after the object is destroyed
        if (player.controller.status == 'connected') {
            room.disconnectController(id);
        }
        room.removePlayerByID(id);
        idPlayer.delete(id);

        const message = `${playerName} left the room.`;
        broadcast(room, message);
    }
    onCloseWebSocket(ws);
}
/**
 * 
 * @param {WebSocket} ws 
 */
function onCloseHostWebSocket(ws) {
    const room = idRoom.get(ws.id);
    const text = `Host left the room.`;
    room.status.general = 'no_host';
    broadcast(room, text);
    room.disconnectHost();
    onCloseWebSocket(ws);
}
/**
 * 
 * @param {WebSocket} ws 
 */
function onCloseWebSocket(ws) {
    const id = ws.id;
    const room = idRoom.get(id);//should return the room object if there's a room
    idws.delete(id);
    idRoom.delete(id);
    if (room) {
        console.log(room.printStats());
    }
}
wss.on('listening', () => {
    console.log('server is listening on port 8080');
});

//
// Start the server.
//
server.listen(port, function () {
    console.log(`Listening on http://localhost:${port}`);
    createTestRoom();
});

/**
 * Send an error message back with just string
 * @param {WebSocket} ws 
 * @param {String} text the message text/string
 * @param {String} result default 'fail'
 * @param {String} status default 'error'
 */
function sendErrorMessage(ws, text, result = 'fail', status = 'error') {

    const data = {
        result: result,
        text: text,
    }
    const message = {
        type: 'SERVER_MESSAGE',
        header: 'error',
        sender: 'server',
        status: status,
        data: JSON.stringify(data),
    }
    ws.send(JSON.stringify(message));
    console.error(`${text}`);
}
let roomCodes = new Set();
/**
 * Check if a roomCode has already been used (When creating a new room)
 * @param {String} roomCode 
 * @returns 
 */
function checkValidRoomCode(roomCode) {
    if (roomCode === undefined) {
        return false;
    }
    if (roomCodes.has(roomCode)) {
        return false;
    }
    else return true;
}
/**
 * Wrapper function for map for syntax sake
 * @param {String} id 
 * @returns {Room}
 */
function getRoomFromID(id) {
    return idRoom.get(id);
}
/**
 * Find a room given its Room Code
 * @param {String} roomCode 
 * @returns {Room} the room object
 */
function findRoomFromCode(roomCode) {
    return rooms.find(room => room.roomCode === roomCode);
}

/**
 * Send a String message to be displayed in the room's chat/log to everyone
 * @param {Room} room the room object
 * @param {string} text string message to be sent to everyone
 */
function broadcast(room, text) {
    if (room) {
        room.newLog({
            type: 'SERVER_MESSAGE',
            sender: 'server',
            header: 'broadcast',
            text: text,
        });
    }
    else {
        console.warn(`Server is trying to broadcast to room: ${roomCode}, but it doesn't exist`)
    }
}
/**
 * Packs a normal WebSocket message into a JSON format and also packs the data object into a JSON format
 * @param {WebSocket} ws 
 * @param {object} message 
 * @param {object} data 
 * @param {boolean} debug Whether this function will also print out console logs for easy reference
 */
function sendWSMessage(ws, message, data, debug = false) {
    const formattedMessage = message;
    formattedMessage.data = JSON.stringify(data);
    ws.send(JSON.stringify(formattedMessage));
    if (debug) {
        console.log(`Sending to: ${ws.id}`)
        console.log(message)
    }
}