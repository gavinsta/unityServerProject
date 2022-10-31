# Server

## Authentication
Handled on connection of Websocket
## Websocket Messages
All messages will have the same fields for the sake of Unity being able to interpret them.
``` json
type: the type of the message being sent
header: additonal meta-info, secondary to type
sender: who is sending this message (server, playerName, host)
controllerKey: the controller key associated with the data
text: text associated with this particular message
status: optionally carries additional meta information
data: a stringified object that holds all additional
data.
```

### Types of messages:
 - SERVER_MESSAGE: server messages such as connections, disconnections, timeouts, etc.
 - FULL_LOG: the full log is sent to the player or host
 - COMMAND: these messages will be sent from the players to the server and then processed. Some will end up being sent to the host.
	 - for testing, they will all end up in the log array

	Some COMMANDs will elicit an `UPDATE` type response:
	- when a `choice COMMAND` is sent, the server will send an `UPDATE` to let the client know that the choice has been received.
 
 - LOG: messages sent from host to the server to log actions that are taking place
 - CHAT: messages being sent from players (or host) to the server that are then also stored in the log.
 - REQUEST: messages that anticipate a reply/require information. They should always be met with an UPDATE message. Header types include:
	 - `game_context`: get the current `GameContext` object from the server. If sent from the server, it will request an updated `GameContext `object from Unity
	 - `controller_connection`: send a message to the server to connect a client to a controller using the provided `controllerKey` value. If successful, the server will return a message of type `UPDATE` and header: `controller_connection`, with the property `status` in the `message.data` object.
	 - `controller_disconnection`: disconnects the player from the controller.

     
 #### Command Types
 - choices: This is the header sent to Unity for the bundled player choices that are then re-interpreted into  actions.
 - settings: changes the settings in Unity OR in the server (depends on what the setting actually is).
