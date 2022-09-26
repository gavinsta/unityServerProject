import JoinRoom from "./JoinRoom";
import { GameContext, useGameContext } from "../contexts/GameContext";
export function RoomControls() {
  const { inRoom, roomCode, setRoomCode, playerName, setPlayerName,
    controllerKey, setControllerKey, controllerStatus, setControllerStatus,
    requestConnectController, closeConnection
  } = useGameContext();


  function confirmConnection() {
    if (controllerStatus == "connected") {

    }
  }
  return (
    <div
      style={{ height: 30 }}>
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
      <InputText
        value={controllerKey}
        setValue={setControllerKey}
        isActive={controllerStatus == "connected" ? true : false}
        label="KEY"
      />
      <button
        onClick={() => {
          requestConnectController();
          setControllerStatus("pending");
          setTimeout(confirmConnection, 1000)
        }}
      >
        Connect Controller
      </button>
      <button>
        Update
      </button>
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
      }} />
  )
}