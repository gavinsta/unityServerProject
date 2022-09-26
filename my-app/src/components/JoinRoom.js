import { GameContext, useGameContext } from "../contexts/GameContext"

export default function JoinRoom() {
    const { establishWebSocketConnection, inRoom, roomCode, controllerKey, playerName } = useGameContext();
    return (
        <button onClick={joinRoom}>
            Join Room
        </button>
    );


    function joinRoom() {
        if (inRoom) return; //we shouldn't be triggering join room, if we are already in a room

        if (!roomCode) {
            console.log(`Room Code cannot be blank`);
            return;
        }
        if (!playerName) {
            console.log(`Player Name cannot be blank`);
            return;
        }
        console.log(`Room code: ${roomCode} \nController Key: ${controllerKey} \nPlayer Name: ${playerName}`);
        establishWebSocketConnection();
    }
}