import React from 'react';
import './MainContent.css';

const MainContent = ({ selectedPrompt, onPromptChange }) => {
  const handleInputChange = (event) => {
    onPromptChange(event.target.value);
  };

  return (
    <div className="main-content">
      <div className="chat-area">
        <div className="chat-message">
          Hi there! How can I assist you today?
        </div>
      </div>
      <div className="input-area">
        <input
          type="text"
          placeholder="Enter your query"
          className="prompt-input"
          value={selectedPrompt}
          onChange={handleInputChange}
        />
        <button className="send-button">→</button>
      </div>
    </div>
  );
};

export default MainContent;
