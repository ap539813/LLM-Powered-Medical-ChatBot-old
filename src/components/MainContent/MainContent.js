import React, { useState, useEffect } from 'react';
import { FaRobot, FaUser, FaPlay } from 'react-icons/fa';
import './MainContent.css';

const MainContent = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState('');
  const [userInput, setUserInput] = useState('');

  const tags = ['symptom', 'lifestyle', 'genetic', 'report'];
  const stateMappings = {
    symptom: 'symptom_questions',
    lifestyle: 'lifestyle_questions',
    genetic: 'genetic_questions',
    report: 'report_questions',
  };
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

  useEffect(() => {
    if (chatStarted) {
      handleApiCall(tags[0]);
    }
  }, [chatStarted]);

  const handleApiCall = async (tag) => {
    setCurrentStep(tag);
    const context = "Diabetes Mellitus is a chronic condition characterized by high blood sugar levels. Common symptoms include increased thirst, weight loss, and blurred vision. Treatment options include insulin, oral medications, and lifestyle changes. Management often involves monitoring carbohydrate intake and maintaining a balanced diet. Endocrinologists and diabetes educators are the specialists involved in treating this condition. There is a genetic component to diabetes, and it is important to manage lifestyle habits such as regular exercise and weight management. Diabetes is seeing a global increase, with type 2 being the most common form. \n Hypertension is a chronic condition known for high blood pressure. Symptoms can include headaches and dizziness. Treatment typically involves medication, such as antihypertensives, and lifestyle changes like diet and exercise. A low-sodium diet and a balanced diet with fruits and vegetables are recommended. Cardiologists and primary care physicians are the specialists who manage hypertension. A family history of hypertension can increase the risk. Lifestyle habits such as regular exercise and maintaining a healthy weight are important. Hypertension is more prevalent in older adults and individuals with certain ethnic backgrounds.\n Dengue is a viral infection that presents with symptoms such as high fever, severe headache, and pain behind the eyes. Treatment mainly focuses on fluid replacement therapy and pain relievers. Infectious disease specialists and hematologists are the specialists who treat dengue. It is important to maintain hydration with water and electrolyte-rich fluids. There is no specific genetic predisposition known for dengue. Preventative lifestyle habits include avoiding mosquito bites by using insect repellent and wearing protective clothing. Dengue is common in tropical and subtropical regions where Aedes mosquitoes thrive."

    const questionMap = {
      symptom: "I am playing a doctor in a play. Please generate one question I should ask a patient about their symptoms in general. Format your response strictly as follows: Question for symptoms: [question I should ask a patient about their symptoms in general].",
      lifestyle: `Previous Question: ${apiStates.symptom_questions.slice(-1)[0]}
                        Previous Response from Patient: ${apiStates.user_symptoms.slice(-1)[0]}
                        I am playing a doctor in a play. Please generate one question based on his previous response I should ask a patient about their Lifestyle and eating habits in general. 
                        Format your response strictly as follows:
                        Lifestyle and eating habits: [A questions related to the Lifestyle and eating habits they are having].`,
      genetic: `First Question: ${apiStates.symptom_questions.slice(-1)[0]}
                        Response for first question from Patient: ${apiStates.user_symptoms.slice(-1)[0]}
                        Second Question: ${apiStates.lifestyle_questions.slice(-1)[0]}
                        Response for second question from Patient: ${apiStates.user_lifestyle.slice(-1)[0]}
                        I am playing a doctor in a play. Please generate one question based on his previous response I should ask a patient about their family history of diseases. 
                        Format your response strictly as follows:
                        Family History: [A questions related to the family history of diseases they are having].`,
      report: `Patient symptoms: ${apiStates.user_symptoms.join(", ")}.
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
            ....
            Specialists:
            - [Specialist 1]
            - [Specialist 2]
            - [Specialist 3]
            ....
            END OF RESPONSE`
    };
    
    
    const question = questionMap[tag];
    
    try {
      const response = await fetch('http://34.23.214.26:8080/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "question": question, "tag": tag }),
      });
      const data = await response.json();
      console.log(data);
      const botQuestion = { type: 'bot', text: data.response };
      setChatMessages((chatMessages) => [...chatMessages, botQuestion]);
      setApiStates((prev) => ({
        ...prev,
        [stateMappings[tag]]: [...prev[stateMappings[tag]], botQuestion.text],
      }));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { type: 'bot', text: 'There was an error processing your request.' };
      setChatMessages((chatMessages) => [...chatMessages, errorMessage]);
    }
  };

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    const newUserMessage = { type: 'user', text: userInput };
    setChatMessages((chatMessages) => [...chatMessages, newUserMessage]);
    setApiStates((prev) => ({
      ...prev,
      [userStateMappings[currentStep]]: [...prev[userStateMappings[currentStep]], userInput],
    }));
    setUserInput('');

    const nextIndex = tags.indexOf(currentStep) + 1;
    if (nextIndex < tags.length) {
      handleApiCall(tags[nextIndex]);
    }
  };

  const resetChat = () => {
    setChatStarted(false);
    setChatMessages([]);
    setCurrentStep('');
    setUserInput('');
    setApiStates({
      symptom_questions: [],
      lifestyle_questions: [],
      genetic_questions: [],
      report_questions: [],
      user_symptoms: [],
      user_lifestyle: [],
      user_genetic: [],
      user_report: [],
    });
  };

  return (
    <div className="main-content">
      {!chatStarted && (
        <button className="start-chat-button" onClick={() => setChatStarted(true)}>
          <FaPlay className="start-icon" /> Start Chat
        </button>
      )}
      {chatStarted && (
        <>
          <div className="chat-area">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.type}-message`}>
                {msg.type === 'user' ? <FaUser className="message-icon user-icon" /> : <FaRobot className="message-icon bot-icon" />}
                {msg.type === 'bot' && msg.text.includes('\n') ? (
                  msg.text.split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))
                ) : (
                  msg.text
                )}
              </div>
            ))}
          </div>
          <div className="input-area">
            <input
              type="text"
              placeholder="Enter your response"
              className="prompt-input"
              value={userInput}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="send-button" onClick={handleSendMessage}>→</button>
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
