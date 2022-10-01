import React, { createContext, useState, useEffect, useContext } from "react";
import { parse } from "uuid";

export const GameContext = createContext({});


export function GameContextProvider({ children }) {
  const [gameState, setGameState] = useState([]);
  const [roomCode, setRoomCode] = useState([]);
  const [playerName, setPlayerName] = useState([]);
  const [controllerKey, setControllerKey] = useState("");
  const [controllerStatus, setControllerStatus] = useState("none");

  const [fullLog, setFullLog] = useState([]);
  const [webSocket, setWebSocket] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [choiceContext, setChoiceContext] = useState({});


  async function establishWebSocketConnection() {
    const wsURL = `ws://localhost:8080/?join=${roomCode}&name=${playerName}`
    console.log(wsURL)
    let ws = new WebSocket(wsURL);
    ws.onerror = ws.onmessage = ws.onopen = ws.onclose = null;
    ws.onerror = (e) => {
    };
    ws.onopen = function () {
      setInRoom(true);
    };
    ws.onclose = function () {
      handleDisconnect();
    };
    ws.onmessage = ((event) => {
      const message = JSON.parse(event.data);
      handleIncomingMessage(message);
    });
    setWebSocket(ws);

    requestUpdateGameContext();
  };

  function handleDisconnect() {
    setInRoom(false);
    setControllerStatus("none");
    setFullLog([]);
    setChoiceContext(null);
  }
  function sendWSMessage(message, data) {
    message.sender = playerName;
    message.controllerKey = controllerKey;
    message.data = JSON.stringify(data);
    webSocket.send(JSON.stringify(message))
  }

  function closeConnection() {
    webSocket.close();
  }



  function handleIncomingMessage(message) {
    const { type, header, sender, status, data } = message
    let parsedData;
    console.log(message)
    if (data) {
      parsedData = JSON.parse(data)

      console.log(parsedData);
    }

    if (type === 'FULL_LOG' || type === 'LOG') {
      //all chat and log messages are sent in a bundle and the client can filter accordingly
      if (!parsedData) {
        console.warn(`No data present in the chat log!`)
        return;
      }
      setFullLog(parsedData);
      return;
    }
    if (type === 'UPDATE') {
      switch (header) {
        case "game_context":
          setGameState(parsedData.gameState);
          console.log(`Current Game State: ${gameState}`);
          break;
        case "controller_connection":
          console.log(`want to set status: ${status}`);
          setControllerStatus(status);
          break;
        case "choice_context":
          console.log("received choice context.");
          setChoiceContext(parsedData);
          break;
      }
      return;
    }
    if (type === 'room_stats') {
      //TODO format show room info to the player
      //clearSystemMessages();
      //showSystemMessage(obj.message);
    }
    if (type === 'SERVER') {
      //showSystemMessage(`${ obj.result }: ${ obj.message }.${ obj.status }`);
    }
  }

  function sendLog(text) {
    const message = {
      type: "LOG",
      text: text,
      sender: playerName,
    }

    sendWSMessage(message);
  }
  function sendChat(text) {
    const message = {
      type: "CHAT",
      text: text,
      sender: playerName,
    }
    sendWSMessage(message);
    console.log(message);
  }

  function requestUpdateGameContext() {
    const message = {
      type: "REQUEST",
      header: "game_context"
    }
    sendWSMessage(message);
    console.log(message);
  }

  function requestConnectController() {
    const message = {
      type: "REQUEST",
      header: "controller_connection",
    }
    sendWSMessage(message)
    console.log(message);
  }

  function requestDisconnectController() {
    const message = {
      type: "REQUEST",
      header: "controller_disconnection",
    }
    sendWSMessage(message)
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        roomCode,
        setRoomCode,
        playerName,
        setPlayerName,
        establishWebSocketConnection,
        fullLog,
        sendChat,
        sendLog,
        closeConnection,
        inRoom,
        controllerKey,
        setControllerKey,
        controllerStatus,
        setControllerStatus,
        choiceContext,
        setChoiceContext,
        requestConnectController,
        requestDisconnectController,
        requestUpdateGameContext,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error(
      "useGameContext must be used within a GameContextProvider"
    );
  }
  return context;
};