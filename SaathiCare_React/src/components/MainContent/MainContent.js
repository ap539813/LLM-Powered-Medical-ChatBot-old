import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaRobot, FaUser, FaPlay } from 'react-icons/fa';
import './MainContent.css';

const MainContent = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [shuffledTags, setShuffledTags] = useState([]);

  const initialTags = ['symptom', 'lifestyle', 'genetic'];

  useEffect(() => {
    if (chatStarted && shuffledTags.length > currentTagIndex) {
      handleApiCall(shuffledTags[currentTagIndex]);
    }
  }, [chatStarted, shuffledTags, currentTagIndex]);

  const startChat = () => {
    const shuffled = shuffleArray([...initialTags]);
    shuffled.push('report');
    setShuffledTags(shuffled);
    setCurrentTagIndex(0);
    setChatStarted(true);
    setChatMessages([]);
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const stateMappings = useMemo(() => ({
    symptom: 'symptom_questions',
    lifestyle: 'lifestyle_questions',
    genetic: 'genetic_questions',
    report: 'report_questions',
  }), []);

  const userStateMappings = {
    symptom: 'user_symptoms',
    lifestyle: 'user_lifestyle',
    genetic: 'user_genetic',
    report: 'user_report',
  };

  const [apiStates, setApiStates] = useState({
    symptom_questions: [],
    lifestyle_questions: [],
    genetic_questions: [],
    report_questions: [],
    user_symptoms: [],
    user_lifestyle: [],
    user_genetic: [],
    user_report: [],
  });

  const handleApiCall = useCallback(async (tag) => {
    let prompt = generatePromptForTag(tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings);

    try {
      const response = await fetch('http://34.75.162.137:8080/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, tag: tag }),
      });
      const data = await response.json();
      const botQuestion = { type: 'bot', text: data.response };
      setChatMessages((chatMessages) => [...chatMessages, botQuestion]);
      setApiStates((prevStates) => ({
        ...prevStates,
        [stateMappings[tag]]: [...prevStates[stateMappings[tag]], data.response],
      }));
    } catch (error) {
      console.error('Error:', error);
      setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: 'There was an error processing your request.' }]);
    }
  }, [currentTagIndex, shuffledTags, apiStates]);

  const handleInputChange = (event) => {
    console.log(event.target.value);
    setUserInput(event.target.value);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    const newUserMessage = { type: 'user', text: userInput };
    setChatMessages((chatMessages) => [...chatMessages, newUserMessage]);
    setUserInput('');

    const nextIndex = currentTagIndex + 1;
    if (nextIndex < shuffledTags.length) {
      setCurrentTagIndex(nextIndex);
    }
  };

  const resetChat = () => {
    setChatStarted(false);
    setChatMessages([]);
    setCurrentTagIndex(0);
    setUserInput('');
    setShuffledTags([]);
  };

  return (
    <div className="main-content">
      {!chatStarted && (
        <button className="start-chat-button" onClick={startChat}>
          <FaPlay className="start-icon" /> Start Chat
        </button>
      )}
      {chatStarted && (
        <>
          <div className="chat-area">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.type}-message`}>
                {msg.type === 'user' ? <FaUser className="message-icon user-icon" /> : <FaRobot className="message-icon bot-icon" />}
                <div>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="input-area">
            <input
              type="text"
              placeholder="Type your response..."
              className="prompt-input"
              value={userInput}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="send-button" onClick={handleSendMessage}>Send</button>
          </div>
        </>
      )}
      {chatStarted && (
        <button className="reset-chat-button" onClick={resetChat}>
          Reset Chat
        </button>
      )}
    </div>
  );
};

export default MainContent;

function generatePromptForTag(tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings) {
  let prompt = "";
  const context = "Diabetes Mellitus is a chronic condition characterized by high blood sugar levels. Common symptoms include increased thirst, weight loss, and blurred vision. Treatment options include insulin, oral medications, and lifestyle changes. Management often involves monitoring carbohydrate intake and maintaining a balanced diet. Endocrinologists and diabetes educators are the specialists involved in treating this condition. There is a genetic component to diabetes, and it is important to manage lifestyle habits such as regular exercise and weight management. Diabetes is seeing a global increase, with type 2 being the most common form. \n Hypertension is a chronic condition known for high blood pressure. Symptoms can include headaches and dizziness. Treatment typically involves medication, such as antihypertensives, and lifestyle changes like diet and exercise. A low-sodium diet and a balanced diet with fruits and vegetables are recommended. Cardiologists and primary care physicians are the specialists who manage hypertension. A family history of hypertension can increase the risk. Lifestyle habits such as regular exercise and maintaining a healthy weight are important. Hypertension is more prevalent in older adults and individuals with certain ethnic backgrounds.\n Dengue is a viral infection that presents with symptoms such as high fever, severe headache, and pain behind the eyes. Treatment mainly focuses on fluid replacement therapy and pain relievers. Infectious disease specialists and hematologists are the specialists who treat dengue. It is important to maintain hydration with water and electrolyte-rich fluids. There is no specific genetic predisposition known for dengue. Preventative lifestyle habits include avoiding mosquito bites by using insect repellent and wearing protective clothing. Dengue is common in tropical and subtropical regions where Aedes mosquitoes thrive."
  
  if (currentTagIndex === 2) { 
    const firstTag = shuffledTags[0];
    const secondTag = shuffledTags[1];
    const firstQuestion = apiStates[stateMappings[firstTag]].slice(-1)[0];
    const firstResponse = apiStates[userStateMappings[firstTag]].slice(-1)[0];
    const secondQuestion = apiStates[stateMappings[secondTag]].slice(-1)[0];
    const secondResponse = apiStates[userStateMappings[secondTag]].slice(-1)[0];
    
    prompt = `First Question: ${firstQuestion}
               Response for first question from Patient: ${firstResponse}
               Second Question: ${secondQuestion}
               Response for second question from Patient: ${secondResponse}
               I am playing a doctor in a play. Please generate one question based on the previous responses I should ask a patient about their ${tag}. 
               Format your response strictly as follows:
               ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (tag === 'report') {
    prompt = `Patient symptoms: ${apiStates.user_symptoms.join(", ")}.
              Lifestyle and eating habits: ${apiStates.user_lifestyle.join(", ")}.
              Family history of diseases: ${apiStates.user_genetic.join(", ")}.

              Data Source for analysis:
              ${context}

              Based on the patient's symptoms and provided context, provide a possible diagnosis, recommended treatments, and specialists to consult. 
              NOTE: This will not be considered as a real treatment, don't give any note or precaution with your response.
              Format your response strictly as follows:
              Diagnosis: [Specific diagnosis based on the symptoms].
              Treatments:
              - [Treatment 1]
              - [Treatment 2]
              - [Treatment 3]
              ...
              Specialists:
              - [Specialist 1]
              - [Specialist 2]
              - [Specialist 3]
              ...
              END OF RESPONSE`;
  } else {
    if (currentTagIndex > 0) {
      const previousTag = shuffledTags[currentTagIndex - 1];
      const lastQuestion = apiStates[stateMappings[previousTag]].slice(-1)[0];
      const lastResponse = apiStates[userStateMappings[previousTag]].slice(-1)[0];
      
      prompt = `Previous Question: ${lastQuestion}
                Previous Response from Patient: ${lastResponse}
                I am playing a doctor in a play. Please generate one question based on the previous response I should ask a patient about their ${tag}. 
                Format your response strictly as follows:
                ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
    } else {
      prompt = `I am playing a doctor in a play. Please generate one question I should ask a patient about their ${tag}. 
                Format your response strictly as follows: 
                ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
    }
  }
  return prompt;
}


