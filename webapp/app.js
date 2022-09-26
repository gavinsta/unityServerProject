(function () {
    const systemMessages = document.querySelector('#systemMessages');
    const leaveRoom = document.querySelector('#leave');
    leaveRoom.hidden = true;
    const joinRoom = document.querySelector('#join');
    const createRoom = document.querySelector('#create');
    const connectControllerButton = document.querySelector('#connectController');
    const roomCodeInput = document.getElementById("roomCodeInput");
    const controllerKeyInput = document.getElementById("controllerKeyInput");
    const playerNameInput = document.getElementById('playerNameInput');
    const messagingForm = document.getElementById("messagingForm");
    const allMessages = document.getElementById('messages');
    let controllerKey;
    let roomCode;
    let playerName;

    function showSystemMessage(data) {
        text = data;
        if (data.message) {
            text = data.message;
        }
        systemMessages.textContent += `\r\n ${text}`;
        systemMessages.scrollTop = systemMessages.scrollHeight;
        return data;
    }

    function handleResponse(response) {
        return response.ok
            ? response.json()
            /*.then((data) => {
                console.log(JSON.stringify(data, null, 2));
                return data;
            })
            */
            : Promise.reject(new Error('Unexpected response'));
    }
    createRoom.onclick = function create() {
        roomCode = roomCodeInput.value.toUpperCase();
        if (roomCode) {
            if (roomCode.length < 6) {
                showSystemMessage(`Room Key should be at least 6 digits long`)
            }
            const obj = {
                type: "create_room_request",
                roomCode: roomCode,
                controllerKeys: ['1A1A1A', '2B2B2B', '3C3C3C','4D4D4D']
            }
            fetch('/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(obj), credentials: 'same-origin'
            })
                .then(handleResponse)
                .then((data) => {
                    if (data.result === 'success') {
                        return data.message;
                    }
                    else return data.message;
                })
                .then(showSystemMessage)
                .catch((err) => {
                    showSystemMessage(err.message);
                });
        }
        else {
            showSystemMessage(`Need Room Code`);
        }
    }
    let ws;
    joinRoom.onclick = async function join() {
        //if a websocket has already been established -> exit
        if (ws && inRoom) return;
        clearChat();
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
        //try using the room code
        const obj = {
            type: "join_request",
            roomCode: roomCode,
            controllerKey: controllerKey,
            playerName: playerName
        }
        console.log(`Room code: ${obj.roomCode} \nController Key: ${obj.controllerKey} \nPlayer Name: ${obj.playerName}`);
        await fetch('/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj), credentials: 'same-origin'
        })
            .then(handleResponse)
            .then((data) => {
                showSystemMessage(data.message);
                if (data.result == 'success') {
                    inRoom = true;
                    establishWebSocketConnection();
                }
                else {
                    inRoom = false;
                }
                return data;
            })
            .then((data) => {
                if (data.log) {
                   updateChat(data.log);
                }
                return data;
            })
            .catch(function (err) {
                showSystemMessage(err.message);
            });
        updateButtons();
    };

    leaveRoom.onclick = async function () {
        await fetch('/leave', { method: 'DELETE', credentials: 'same-origin' })
            .then(handleResponse)
            .then((data) => {
                return data.message;
            })
            .then(showSystemMessage)
            .catch(function (err) {
                showSystemMessage(err.message);
            });

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
            joinRoom.hidden = true;
            leaveRoom.hidden = false;
            playerNameInput.disabled = true;
        }
        else if (!inRoom) {
            document.getElementById("roomCode").textContent = "Room Code: "; roomCodeInput.hidden = false;
            roomCode = '';
            joinRoom.hidden = false;
            roomCodeInput.disabled = false;
            controllerKeyInput.disabled = false;
            leaveRoom.hidden = true;
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
        if (!ws) {
            showSystemMessage(`You must be in a ROOM before you can connect to a controller.`);
            return;
        }
        if (!controllerKey) {
            showSystemMessage(`Controller KEY cannot be blank.`);
            return;
        }

        const obj = {
            type: "connect_request",
            roomCode: roomCode,
            controllerKey: controllerKey,
            playerName: playerName
        }

        fetch('/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj),
            credentials: 'same-origin'
        })
            .then(handleResponse)
            .then((data) => {

                if (data.result == 'success' && data.status == 'new_controller') {
                    //room for some internal logic on the web app
                    //for react
                    hasController = true;
                    updateButtons();
                }
                showSystemMessage(data.message);
            }).catch(showSystemMessage);
    }
    function disconnectController() {
        fetch('/connect', {
            method: 'DELETE',
            credentials: 'same-origin'
        })
            .then(handleResponse)
            .then((data) => {
                console.log(data);
                if (data.result == 'success') {
                    //room for some internal logic on the web app
                    //for react
                    hasController = false;
                    connectControllerButton.textContent = 'Connect Controller';
                }
                showSystemMessage(data.message);
            }).catch(showSystemMessage);
    }
    async function establishWebSocketConnection() {
        ws = new WebSocket(`ws://${location.host}`);
        ws.onerror = ws.onmessage = ws.onopen = ws.onclose = null;
        ws.onerror = (e) => {
            showSystemMessage(`WebSocket error.`);
        };
        ws.onopen = function () {
            showSystemMessage('WebSocket connection established');
            console.log("We are connected :)");
        };
        ws.onclose = function () {
            showSystemMessage('WebSocket connection closed');
            ws = null;
        };
        ws.onmessage = ((event) => {
            try {
                const obj = JSON.parse(event.data);
                if (obj.type === 'chat') {
                    receiveChat(obj);
                }
            } catch (e) {
                console.log(`Error: ${e} trying to parse ${data}`)
            }
        });
    };
    window.onbeforeunload = function() {
        ws.onclose = function () {}; // disable onclose handler first
        ws.close();
    };
    messagingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (ws) {
            if (textInput.value && ws.readyState === WebSocket.OPEN) {
                const obj = {
                    type: "chat",
                    sender: playerName,
                    message: textInput.value,
                    roomCode: roomCode
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
 * 
 * @param {Array} log 
 */
    function updateChat(log) {
        for (var i = 0; i < log.length; i++) {
            printToChat(log[i]);
        }
    }
    function receiveChat(data) {
        printToChat(data.message);
    }
    /**
     * Prints a string message to the chat box
     * @param {String} message 
     */
    function printToChat(message) {
        var item = document.createElement('li');
        item.textContent = message;
        allMessages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    }
    function clearChat() {
        var child = allMessages.lastElementChild;
        while (child) {
            allMessages.removeChild(child);
            child = allMessages.lastElementChild;
        }
    }
})();