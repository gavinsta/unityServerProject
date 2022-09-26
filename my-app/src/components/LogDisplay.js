import { useGameContext } from "../contexts/GameContext";
import { useState, useRef } from "react";
export function LogDisplay() {
  const { fullLog, playerName, sendChat, sendLog } = useGameContext();
  const [text, setText] = useState("");
  const myRef = useRef(null)

  function formatLog(log) {
    const str = `[${log.type}] ${log.sender}: ${log.text}`;
    return <li key={log.time}>{str}</li>
  }

  function send() {
    if (text) {
      sendChat(text);
      setText("");
    }
  }
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'auto min-content',
      }}>
      <div style={{
        overflowY: 'auto',
        height: '100%'
      }}>
        {fullLog.length > 0 ? fullLog.map(formatLog) : <li>No messages</li>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send()
        }}
        style={{

          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: "space-between"
        }}
      >
        <input
          type="text"
          onChange={e => {
            setText(e.target.value)
          }}
          placeholder="Type Here"
          value={text}
          style={{
            flex: 1,
            flexGrow: 1
          }}
        />
        <input
          type="submit" value="Send"
          style={{
            width: 50
          }}
        />
      </form>
    </div>
  );
}