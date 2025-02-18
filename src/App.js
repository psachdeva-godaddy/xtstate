import React from 'react';
import './App.css';
import ConversationsList from './components/ConversationsList';
import './components/ConversationsList.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>XSTATE CONVERSATIONS MACHINE POC</h1>
      </header>
      <main>
        <ConversationsList />
      </main>
    </div>
  );
}

export default App;
