import { useGameContext } from "../contexts/GameContext";
import { useState, useEffect, useRef } from "react";
export function ControlsDisplay() {

  const { gameState, choiceContext } = useGameContext();
  const [selectedChoice, setSelectedChoice] = useState("");
  const [expanded, setExpanded] = useState(null);
  const lastExpanded = useRef();

  function refresh() {
    //TODO reset the current button panels
    setExpanded(null);
  }
  function selectChoice(choice) {

    if (choice.additionalChoices) {
      //if there are more sub options to choose from...
      if (expanded) {
        setExpanded(...expanded, choice);
      }
      else (
        setExpanded([choice])
      )
    }
    else {
      //otherwise select this choice
      setSelectedChoice(choice);
      console.log(`Selected choice: ${choice.choiceName} id: ${choice.choiceID}`);
    }
  }

  function back() {
    if (!expanded) return;
    if (expanded.length > 1) {
      setExpanded(expanded.pop());
    }
    else if (expanded.length == 1) {
      setExpanded(null);
    }
  }
  if (choiceContext.playerChoices) {

  }
  return (<div>
    <p>Currently showing controls:<br />
      {gameState}</p>
    <ButtonDisplay
      choices={expanded ? expanded[expanded.length - 1].additionalChoices : choiceContext.playerChoices}
      selectChoice={selectChoice}
    />
    <div
      style={{
        display: 'flex'
      }}>
      <button
        onClick={back}
        style={{
          color: 'maroon'
        }}>
        Back
      </button>
      <button
        style={{
          color: 'red',
        }}
        onClick={() => {
          refresh();
        }}>Return</button>
    </div>
  </div>)
}

function ButtonDisplay({ choices, selectChoice }) {
  if (!choices) {
    return <div>No choices available</div>
  }
  const choiceButtons = []
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const newButton = <ChoiceButton
      choice={choice}
      selectChoice={selectChoice}
    />
    choiceButtons.push(newButton)
  }


  return <div
    style={{
      display: 'grid',
      gridTemplateColumns: "1fr 1fr 1fr"
    }}>{choiceButtons}</div>

}

function ChoiceButton({ choice, selectChoice, style }) {
  style = {
    display: 'grid'
  }
  return (
    <>
      <button
        onClick={() => {
          selectChoice(choice);
        }}
      >
        {choice.choiceName}
      </button>
    </>
  )
}