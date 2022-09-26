(function () {
    const systemMessages = document.querySelector('#systemMessages');
    const leaveRoom = document.getElementById('leave');
    leaveRoom.style.display = 'none';
    const roomInfoButton = document.querySelector('#roomInfo');
    const joinRoom = document.getElementById('join');
    const createRoom = document.querySelector('#create');
    const connectControllerButton = document.querySelector('#connectController');
    const roomCodeInput = document.getElementById("roomCodeInput");
    const controllerKeyInput = document.getElementById("controllerKeyInput");
    const playerNameInput = document.getElementById('playerNameInput');
    const messagingForm = document.getElementById("messagingForm");
    const log = document.getElementById('log');
    let controllerKey;
    let roomCode;
    let playerName;

    let ws;
    roomInfoButton.onclick = function () {
        if (inRoom) {
            ws.send(JSON.stringify({
                type: 'get_room_stats',
            }))
        }
        else {
            showSystemMessage(`Join a room first!`);
        }
    }
    joinRoom.onclick = async function join() {
        if (ws && inRoom) return; //we shouldn't be triggering join room, if we are already in a room

        roomCode = roomCodeInput.value.toUpperCase();
        playerName = playerNameInput.value.toUpperCase();
        if (!roomCode) {
            roomCodeInput.disabled = false;
            showSystemMessage(`Room Code cannot be blank`);
            return;
        }
        if (!playerName) {
            playerName.disabled = false;
            showSystemMessage(`Player Name cannot be blank`);
            return;
        }
        showSystemMessage(`Room code: ${roomCode} \nController Key: ${controllerKey} \nPlayer Name: ${playerName}`);
        establishWebSocketConnection();
    };

    leaveRoom.onclick = async function () {
        if (ws) { ws.close(); }
        inRoom = false;
        hasController = false;
        updateButtons();
    };

    let inRoom = false;
    function updateButtons() {
        if (inRoom) {
            roomCodeInput.value = roomCode;
            roomCodeInput.disabled = true;
            if (controllerKey) controllerKeyInput.value = controllerKey;
            else controllerKeyInput.value = '';
            joinRoom.style.display = 'none';
            leaveRoom.style.display = 'inline-block';
            playerNameInput.disabled = true;
        }
        else if (!inRoom) {
            //document.getElementById("roomCode").textContent = "Room Code: ";
            roomCodeInput.hidden = false;
            roomCode = '';
            joinRoom.style.display = 'inline-block';
            roomCodeInput.disabled = false;
            controllerKeyInput.disabled = false;
            leaveRoom.style.display = 'none';
            playerNameInput.disabled = false;
        }
        if (hasController) {
            connectControllerButton.textContent = 'Disconnect Controller';
        }
        else if (!hasController) {
            connectControllerButton.textContent = 'Connect Controller';
        }
    }

    let hasController = false;
    connectControllerButton.onclick = function () {
        if (ws && hasController) disconnectController();
        else connectController();
    }
    function connectController() {
        controllerKey = controllerKeyInput.value.toUpperCase();
        if (!ws || !inRoom) {
            showSystemMessage(`You must be in a ROOM before you can connect to a controller.`);
            return;
        }
        if (!controllerKey) {
            showSystemMessage(`Controller KEY cannot be blank.`);
            return;
        }

        const obj = {
            type: "connect",
            controllerKey: controllerKey,
            playerName: playerName
        }
        ws.send(JSON.stringify(obj));
    }
    function disconnectController() {
        const obj = {
            type: "disconnect",
            controllerKey: controllerKey,
            playerName: playerName
        }
        ws.send(JSON.stringify(obj));
        hasController = false;
        updateButtons();
    }
    async function establishWebSocketConnection() {
        ws = new WebSocket(`ws://${location.host}/?join=${roomCode}&name=${playerName}`);
        ws.onerror = ws.onmessage = ws.onopen = ws.onclose = null;
        ws.onerror = (e) => {
            showSystemMessage(`WebSocket error.`);
        };
        ws.onopen = function () {
            showSystemMessage('WebSocket connection established');
            console.log("We are connected :)");
            inRoom = true;
            updateButtons();
        };
        ws.onclose = function () {
            showSystemMessage('WebSocket connection closed');
            ws = null;
            inRoom = false;
            hasController = false;
            updateButtons();
        };
        ws.onmessage = ((event) => {
            const obj = JSON.parse(event.data);
            let parsedData;
            if (obj.data) {
                parsedData = JSON.parse(obj.data)
            }

            if (obj.type === 'chat') {
                receiveChat(obj);
                return;
            }
            if (obj.type === 'log'){
                receiveChat(obj);
                return;
                //TODO for now log and chats are handled the same way
            }
            if (obj.type === 'update_log') {
                fullyUpdateChat(obj);
                return;
            }
            if (obj.type === 'room_stats') {
                //TODO format show room info to the player
                clearSystemMessages();
                showSystemMessage(obj.message);
            }
            if (obj.type == 'connect_confirm' && parsedData.controllerKey == controllerKey) {
                hasController = true;
                showSystemMessage(obj.message)
                updateButtons();
                return;
            }
            if (obj.type == 'server') {
                showSystemMessage(`${obj.result}: ${obj.message}.${obj.status}`);
            }

        });
        //TODO add in async connecting phase in case we need to wait
    };
    window.onbeforeunload = function () {
        ws.onclose = function () { }; // disable onclose handler first
        ws.close();
    };
    messagingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (ws) {
            if (textInput.value && ws.readyState === WebSocket.OPEN) {
                const obj = {
                    type: 'chat',
                    message: textInput.value,
                };
                ws.send(JSON.stringify(obj));
                textInput.value = '';
            }
            else if (ws.readyState !== WebSocket.OPEN) {
                showSystemMessage("Connection not ready yet!")
            }
        }
        else {
            showSystemMessage("Not connected to Room")
        }
    });
    /**
     * Wipes the current chat and reloads all saved logs from this room
     * @param {EventData} obj 
     */
    function fullyUpdateChat(obj) {
        clearChat();
        if (obj.data) {
            const log = JSON.parse(obj.data);
            for (var i = 0; i < log.length; i++) {
                printToChat(log[i]);
            }
        }
    }
    function receiveChat(obj) {
        printToChat(obj.message);
    }
    /**
     * Prints a string message to the chat box
     * @param {String} message 
     */
    function printToChat(message) {
        var item = document.createElement('li');
        item.textContent = message;
        log.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    }
    function clearChat() {
        var child = log.lastElementChild;
        while (child) {
            log.removeChild(child);
            child = log.lastElementChild;
        }
    }
    function showSystemMessage(data) {
        let text = data;
        if (data.message) {
            text = data.message;
        }
        var item = document.createElement('li');
        item.textContent = text;
        systemMessages.appendChild(item);
        //window.scrollTo(0, document.body.scrollHeight);
        systemMessages.scrollTop = systemMessages.scrollHeight;
        console.log(text);
        //return data;
    }
    function clearSystemMessages() {
        var child = systemMessages.lastElementChild;
        while (child) {
            systemMessages.removeChild(child);
            child = systemMessages.lastElementChild;
        }
    }
})();