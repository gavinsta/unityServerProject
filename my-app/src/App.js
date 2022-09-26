import logo from './logo.svg';
import './App.css';
import { JoinRoom } from './components/JoinRoom';
import { GameContextProvider } from './contexts/GameContext';
import { TabGroup } from './components/TabGroup';
import { RoomControls } from './components/RoomControls';
import { StyleContextProvider } from './contexts/StyleContext';
import { PageContent } from './components/PageContent';
function App() {
  return (
    <StyleContextProvider>
      <GameContextProvider>
        <div
          style={{
            height: '100vh',
            gridTemplateRows: 'min-content minmax(0,auto)',
            display: 'grid',
          }}>
          <div>
            <RoomControls />
            <TabGroup />
          </div>
          <PageContent />
        </div>

      </GameContextProvider>
    </StyleContextProvider>
  );
}

export default App;
