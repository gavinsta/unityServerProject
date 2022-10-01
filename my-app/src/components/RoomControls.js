import JoinRoom from "./JoinRoom";
import React, { useCallback, useEffect, useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import { useStyleContext } from "../contexts/StyleContext"


export function RoomControls() {
  const { inRoom, roomCode, setRoomCode, playerName, setPlayerName,
    controllerKey, setControllerKey, controllerStatus, setControllerStatus,
    requestConnectController, requestDisconnectController, closeConnection
  } = useGameContext();
  const { systemMessage, setSystemMessage } = useStyleContext();
  const [connectControllerButtonText, setConnectControllerButtonText] = useState("Connect Controller");

  function checkConnection() {
    let text = ""
    switch (controllerStatus) {
      case "pending":
        text = "Connecting to Controller timed out.";
        setControllerStatus("none")
        break;
      case "connected":
        text = `Connected successfully to ${controllerKey}`
        break;
      case "fail":
        text = `Failed to connect to controller.`
        break;
    }
    setSystemMessage(text);
    setTimeout(() => {
      setSystemMessage("")
    }, 2500);
    return;
  }

  useEffect(() => {
    if (controllerStatus == "connected") {
      console.log(`Connected to ${controllerKey}`);
      setConnectControllerButtonText("Disconnect Controller");
    }
    else {
      setConnectControllerButtonText("Connect Controller");
    }

    checkConnection();
  }, [controllerStatus]);
  return (
    <div
      style={{
        gridTemplateAreas: `"control1 control2"
    "console console"`,
        display: "grid"
      }}>
      <div
        style={{
          height: 40,
          gridArea: "control1"
        }}>
        <InputText
          value={playerName}
          setValue={setPlayerName}
          isActive={!inRoom}
          label="NAME"
        />
        <InputText
          value={roomCode}
          setValue={setRoomCode}
          isActive={!inRoom}
          label="CODE"
        />
        {!inRoom ? <JoinRoom />
          : <button
            onClick={closeConnection}
          >
            Leave Room
          </button>}
      </div>
      <div
        style={{
          height: 40,
          gridArea: "control2"
        }}
      >
        <InputText
          value={controllerKey}
          setValue={setControllerKey}
          isActive={controllerStatus == "connected" ? false : true}
          label={"KEY | " + controllerStatus}
        />
        <button
          onClick={() => {
            if (controllerStatus != "connected" && controllerStatus != "pending") {
              setControllerStatus("pending");
              console.log('Requesting connection')
              requestConnectController();

            }
            else if (controllerStatus == "connected") {
              requestDisconnectController();
              console.log('Requesting disconnect');
              setControllerStatus("none")
            }

          }}
          disabled={!inRoom}
        >
          {connectControllerButtonText}
        </button>

      </div>
      <div style={{
        height: 40,
        gridArea: "console",
        display: 'inline-block',
      }}>
        <p style={{ width: "85%", display: "inline-flex", border: "3px solid grey" }}>
          {systemMessage}
        </p>
        <button
          style={{ display: "inline" }}>
          Update
        </button>
      </div>
    </div>
  );

};

export function InputText({ isActive = true, label, value, setValue }) {
  return (
    <input
      placeholder={label}
      type="text"
      value={value}
      onChange={e => {
        if (isActive) setValue(e.target.value.toUpperCase())
      }}
      disabled={!isActive} />
  )
}