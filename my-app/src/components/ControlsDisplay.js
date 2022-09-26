import { useGameContext } from "../contexts/GameContext";
import { useState } from "react";
export function ControlsDisplay() {
  const { gameState } = useGameContext();
  const [selectedChoice, setSelectedChoice] = useState("");

  return (<div>
    <p>Currently showing controls:<br />
      {gameState}</p>
  </div>)
}