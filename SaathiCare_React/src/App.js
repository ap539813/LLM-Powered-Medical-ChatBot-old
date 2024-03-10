import React, { useState } from 'react';
import Navbar from './components/NavBar/NavBar';
import Sidebar from './components/SideBar/SideBar';
import MainContent from './components/MainContent/MainContent';
import './App.css';

const App = () => {
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const handlePromptSelect = (prompt) => {
    setSelectedPrompt(prompt);
  };

  return (
    <>
      <Navbar />
      <div className="app-body">
        <Sidebar onPromptSelect={handlePromptSelect} />
        <MainContent selectedPrompt={selectedPrompt} onPromptChange={setSelectedPrompt} />
      </div>
    </>
  );
};

export default App;
