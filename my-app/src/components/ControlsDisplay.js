import { useGameContext } from "../contexts/GameContext";
import { useState, useEffect, useRef } from "react";
export function ControlsDisplay() {

  const { gameState, choiceContext, sendChoice } = useGameContext();
  const [selectedChoice, setSelectedChoice] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [hasChoices, setHasChoices] = useState(false);
  const [hoverChoice, setHoverChoice] = useState(null);
  useEffect(() => {
    if (choiceContext?.playerChoices) {
      setHasChoices(true);
    }
    else {
      setHasChoices(false);
    }
  });

  function clearSelection() {
    setExpanded(null);
    setSelectedChoice(null);
  }
  function selectFinalChoice(choice) {
    const finalChoice = {
      type: choice.type,
      choiceName: expanded[0].choiceName,
      choiceDescription: expanded[0].choiceDescription,
      choiceData: expanded[0].choiceData,
      additionalChoices: [],
    }

    let lastChoice = finalChoice;
    //shove the rest of the expanded list into a nested structure
    //TODO add a way to include multiple choices at the same level. We'll revisit this.
    console.log(`expanded.length: ${expanded.length}`)
    for (let i = 1; i < expanded.length; i++) {
      const currentChild = expanded[i];
      lastChoice.additionalChoices.push(currentChild)
      console.log(`Adding ${expanded[i]} to choice`);
      lastChoice = currentChild
    }
    lastChoice.additionalChoices.push(choice);

    return finalChoice;
  }
  function selectChoice(choice) {
    if (choice.additionalChoices) {
      if (expanded) {
        setExpanded(...expanded, choice);
      }
      else (
        setExpanded([choice])
      )
    }
    //if there's no more additional choices
    else {
      setSelectedChoice(selectFinalChoice(choice));
      console.log(`Selected choice: ${choice.choiceName} id: ${choice.choiceID}`);
    }
  }
  function submitChoice() {
    if (selectedChoice) {
      sendChoice(selectedChoice);
    }
    clearSelection();
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
  function getChildChoices() {
    if (expanded && expanded[expanded.length - 1]) {
      if (expanded[expanded.length - 1].additionalChoices !== undefined) {
        return expanded[expanded.length - 1].additionalChoices;
      }
    }
    else return choiceContext?.playerChoices
  }
  return (<div
    style={{
      display: "grid",
      gridTemplateAreas: `"main main info"
      "main main info"
      "end end end"`,
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '2fr 2fr 1fr'
    }}
  >
    {!hasChoices ? <div
      style={{
        gridArea: 'main',
      }}>
      No controls to display
    </div> :
      <ChoiceButtonsDisplay
        style={{
          gridArea: "main", background: 'lightgrey', backgroundColor: 'lightgrey', display: 'grid',
          gridTemplateRows: 'auto min-content', height: '100%'
        }}
        choices={getChildChoices()}
        selectChoice={selectChoice}
        back={back}
        clearSelection={clearSelection}
        setHoverChoice={setHoverChoice}
        submitChoice={submitChoice}
      />
    }
    <InfoPanel
      style={{
        gridArea: "info",
        backgroundColor: 'beige',
        width: '100%',
        display: 'grid',
        gridTemplateRows: 'auto min-content'
      }}
      hoverChoice={hoverChoice}
      selectedChoice={selectedChoice}
    />

  </div>)
}
function InfoPanel({ selectedChoice, hoverChoice, style }) {
  function presentChoiceInfo(choice) {
    //TODO flesh out the choice panel
    if (choice) {
      switch (choice.type) {
        case "COMBAT":
          return (<>
            <div>{choice.choiceName}</div>
            <div>{choice.choiceDescription}</div>
            <div>{choice.choiceData}</div>
          </>);
      }
    }
  }
  return (<><div
    style={style}>
    <div>{hoverChoice && presentChoiceInfo(hoverChoice)}</div>
    <div>
      <h2>Selected:</h2>
      {selectedChoice && presentChoiceInfo(selectedChoice)}
    </div>
  </div>
  </>);
}
function ChoiceButtonsDisplay({ submitChoice, choices, selectChoice, back, clearSelection, style, setHoverChoice }) {

  function renderChoices() {
    if (!choices) {
      return <div
        style={style}>No Choices</div>
    }
    const choiceButtons = []
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const newButton = <ChoiceButton
        style={{
          height: '60px',
          maxHeight: '100px',
          width: '100%'
          //gridTemplateAreas: 'choices'
        }}
        choice={choice}
        selectChoice={selectChoice}
        setHoverChoice={setHoverChoice}
      />
      choiceButtons.push(newButton)
    }
    return choiceButtons;
  }


  return <div
    style={style}>
    <div
      style={{
        //display: 'block',
        overflowY: 'scroll',
        width: '100%',
        height: '100%',
      }}>
      {renderChoices()}
    </div>
    <div
      style={{
        display: 'flex',
      }}>
      <button
        onClick={back}
        style={{
          color: 'maroon',
          width: '30%'
        }}
      //disabled={!hasChoices}
      >
        Back
      </button>
      <button
        style={{
          color: 'red',
          width: '30%'
        }}
        //disabled={!hasChoices}
        onClick={() => {
          clearSelection();
        }}>Clear Selection</button>
      <button
        style={{
          color: 'green',
          width: '30%'
        }}
        onClick={submitChoice}
      >
        Confirm</button>
    </div>
  </div>
}

function ChoiceButton({ choice, selectChoice, setHoverChoice, style }) {
  const [delayHandler, setDelayHandler] = useState(null)

  const handleMouseEnter = event => {
    setDelayHandler(setTimeout(() => {
      if (choice) {
        setHoverChoice(choice);
      }
    }, 300))
  }

  const handleMouseLeave = () => {
    clearTimeout(delayHandler)
  }
  return (
    <>
      <button
        style={style}
        onClick={() => {
          selectChoice(choice);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {choice.choiceName}
      </button>
    </>
  )
}