import React, { createContext, useState, useContext } from "react";
import { parse } from "uuid";
export const GameContext = createContext({});
export function GameContextProvider({ children }) {
  const [gameState, setGameState] = useState([]);
  const [roomCode, setRoomCode] = useState([]);
  const [playerName, setPlayerName] = useState([]);
  const [controllerKey, setControllerKey] = useState("");
  const [controllerStatus, setControllerStatus] = useState("");

  const [fullLog, setFullLog] = useState([]);
  const [websocket, setWS] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [choiceContext, setChoiceContext] = useState({});

  async function establishWebSocketConnection() {
    const wsURL = `ws://localhost:8080/?join=${roomCode}&name=${playerName}`
    console.log(wsURL)
    let ws = new WebSocket(wsURL);
    ws.onerror = ws.onmessage = ws.onopen = ws.onclose = null;
    ws.onerror = (e) => {
      //showSystemMessage(`WebSocket error.`);
    };
    ws.onopen = function () {
      //showSystemMessage('WebSocket connection established');
      setInRoom(true);
      requestUpdateGameContext();
    };
    ws.onclose = function () {
      //showSystemMessage('WebSocket connection closed');
      setInRoom(false);
    };
    ws.onmessage = ((event) => {
      console.log(`messaged`)
      const obj = JSON.parse(event.data);
      handleIncomingMessage(obj);
    });
    setWS(ws);
  };

  function closeConnection() {
    websocket.close();
  }

  function handleIncomingMessage({ type, header, sender, status, data }) {

    let parsedData;
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
          break;
        case "controller_connection":
          setControllerStatus(parsedData.status);
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
      //showSystemMessage(`${obj.result}: ${obj.message}.${obj.status}`);
    }
  }

  function sendLog(text) {
    const message = {
      type: "LOG",
      text: text,
      sender: playerName,
    }

    websocket.send(JSON.stringify(message));
  }
  function sendChat(text) {
    const message = {
      type: "CHAT",
      text: text,
      sender: playerName,
    }
    websocket.send(JSON.stringify(message));
    console.log(message);
  }

  function requestUpdateGameContext() {
    const message = {
      type: "REQUEST",
      header: "get_game_context"
    }
    websocket.send(JSON.stringify(message));
    console.log(message);
  }

  function requestConnectController() {
    const message = {
      type: "REQUEST",
      header: "controller_connection",
      controllerKey: controllerKey,
      playerName: playerName
    }
    websocket.send(JSON.stringify(message));
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

        requestConnectController,
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