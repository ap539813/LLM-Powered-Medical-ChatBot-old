import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaRobot, FaUser, FaPlay, FaMicrophone, FaPaperPlane, FaHourglassHalf } from 'react-icons/fa';
import './MainContent.css';

const MainContent = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [greetingAcknowledged, setGreetingAcknowledged] = useState(false);
  const [currentTagIndex, setCurrentTagIndex] = useState(-1);
  const [userInput, setUserInput] = useState('');
  const [shuffledTags, setShuffledTags] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const speechRecognition = useRef(null);
  const [inputDisabled, setInputDisabled] = useState(false);
  
  const initialTags = ['symptom', 'lifestyle', 'genetic'];

  useEffect(() => {
    if (chatStarted && greetingAcknowledged && currentTagIndex >= 0 && shuffledTags.length > currentTagIndex) {
      handleApiCall(shuffledTags[currentTagIndex]);
    }
  }, [chatStarted, greetingAcknowledged, shuffledTags, currentTagIndex]);

  const lazyInitSpeechRecognition = useCallback(() => {
    if (speechRecognition.current !== null) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      speechRecognition.current = recognition;
    }
  }, []);

  useEffect(() => {
    lazyInitSpeechRecognition();
  }, [lazyInitSpeechRecognition]);

  const toggleListening = useCallback(() => {
    if (!isListening) {
      speechRecognition.current?.start();
    } else {
      speechRecognition.current?.stop();
    }
    setIsListening(!isListening);
  }, [isListening]);

  const startChat = () => {
    const shuffled = shuffleArray([...initialTags]);
    shuffled.push('report');
    setShuffledTags(shuffled);
    setChatStarted(true);
    setGreetingAcknowledged(false); 
    setChatMessages([{ type: 'bot', text: "Hi, I am your doctor. How can I help you today?" }]);
    lazyInitSpeechRecognition();
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
    greeting_question: "Hi, I am your doctor. How can I help you today?",
    greeting_response: "", 
    symptom_questions: [],
    lifestyle_questions: [],
    genetic_questions: [],
    report_questions: [],
    user_symptoms: [],
    user_lifestyle: [],
    user_genetic: [],
    user_report: [],
  });

  const fetchContext = async (userResponses) => {
    try {
      const response = await fetch('http://192.168.29.30:8090/process_responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_responses: userResponses }),
      });
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error fetching context: ", error);
      return "ERROR";
    }
  };

  const handleApiCall = useCallback(async (tag) => {
    setIsLoading(true);
    let context = '';
    if (tag === 'report') {
      const userResponses = {
        lifestyle: apiStates.user_lifestyle.join(", "),
        symptom: apiStates.user_symptoms.join(", "),
        genetic: apiStates.user_genetic.join(", ")
      };
      context = await fetchContext(userResponses);
    }
    let prompt = await generatePromptForTag(tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings, context);
    try {
      const response = await fetch('http://192.168.29.30:8080/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, tag: tag, context: context}),
      });
      const data = await response.json();
      const botQuestion = { type: 'bot', text: data.response };
      setChatMessages((chatMessages) => [...chatMessages, botQuestion]);
      setApiStates((prevStates) => ({
        ...prevStates,
        [stateMappings[tag]]: [...prevStates[stateMappings[tag]], data.response],
      }));
    } catch (error) {
      setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: 'There was an error processing your request.' }]);
    }
    finally {
      setIsLoading(false);
    }
  }, [currentTagIndex, shuffledTags, apiStates]);

  const handleInputChange = useCallback((event) => {
    setUserInput(event.target.value);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!userInput.trim() || isLoading) return;
  
    setInputDisabled(true);
  
    const newUserMessage = { type: 'user', text: userInput };
    setChatMessages(chatMessages => [...chatMessages, newUserMessage]);
  
    if (currentTagIndex === -1) {
      setGreetingAcknowledged(true);
      setApiStates(prevStates => ({
        ...prevStates,
        greeting_response: userInput,
      }));
      setCurrentTagIndex(0);
    } else {
      const currentTag = shuffledTags[currentTagIndex];
      const userStateKey = userStateMappings[currentTag];
      setApiStates(prevStates => ({
        ...prevStates,
        [userStateKey]: [...prevStates[userStateKey], userInput],
      }));
  
      const nextIndex = currentTagIndex + 1;
      if (nextIndex < shuffledTags.length) {
        setCurrentTagIndex(nextIndex);
      }
    }
  
    setUserInput('');
  }, [userInput, shuffledTags, currentTagIndex, greetingAcknowledged, isLoading]);

  useEffect(() => {
    if (isLoading) {
      setInputDisabled(true); 
    } else {
      setInputDisabled(false); 
    }
  }, [isLoading]);

  const resetChat = useCallback(() => {
    setChatStarted(false);
    setChatMessages([]);
    setCurrentTagIndex(-1);
    setUserInput('');
    setShuffledTags([]);
    setGreetingAcknowledged(false);
  }, []);
  

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
            <FaMicrophone className={`mic-icon ${isListening ? 'listening' : ''}`} onClick={toggleListening} />
            <input
              type="text"
              placeholder="Type your response..."
              className="prompt-input"
              value={userInput}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={inputDisabled}
            />
            <button className={`send-button ${isLoading ? 'disabled' : ''}`} onClick={handleSendMessage} disabled={isLoading}>
              {isLoading ? <FaHourglassHalf className="hourglass" /> : <FaPaperPlane />}
            </button>
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

 function generatePromptForTag(tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings,fetchedContext) {
  let prompt = "";
  const greetingQuestion = apiStates.greeting_question;
  const greetingResponse = apiStates.greeting_response;

  if (currentTagIndex === 0) {
    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              I am playing a doctor in a play. Please generate one question I should ask a patient about their ${tag}.
              Format your response strictly as follows: 
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === 1) {
    const previousTag = shuffledTags[currentTagIndex - 1];
    const lastQuestion = apiStates[stateMappings[previousTag]].slice(-1)[0];
    const lastResponse = apiStates[userStateMappings[previousTag]].slice(-1)[0];

    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              Previous Question: ${lastQuestion}
              Previous Response from Patient: ${lastResponse}
              I am playing a doctor in a play. Please generate one question based on the previous responses I should ask a patient about their ${tag}.
              Format your response strictly as follows:
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === 2) {
    const previousTags = shuffledTags.slice(0, 2);
    const previousQuestions = previousTags.map(tag => apiStates[stateMappings[tag]].slice(-1)[0]);
    const previousResponses = previousTags.map(tag => apiStates[userStateMappings[tag]].slice(-1)[0]);

    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              First Question: ${previousQuestions[0]}
              First Response from Patient: ${previousResponses[0]}
              Second Question: ${previousQuestions[1]}
              Second Response from Patient: ${previousResponses[1]}
              I am playing a doctor in a play. Please generate one question that I should ask a patient based on the previous responses, about their ${tag}.
              Format your response strictly as follows:
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === shuffledTags.length - 1) {
    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              Patient symptoms: ${apiStates.user_symptoms.join(", ")}.
              Lifestyle and eating habits: ${apiStates.user_lifestyle.join(", ")}.
              Family history of diseases: ${apiStates.user_genetic.join(", ")}.

              Data Source for analysis:
              ${fetchedContext}

              Based on the patient's symptoms and provided context, provide a possible diagnosis, recommended treatments, and specialists to consult. 
              NOTE: 1. This will not be considered as a real treatment, don't give any note or precaution with your response.
                    2. Make your diagnosis strictly based of of Data Source for analysis provided. 
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
  }

  return prompt;
}
