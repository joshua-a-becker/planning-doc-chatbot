import debounce from 'lodash/debounce';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Send } from 'lucide-react';
//import { useParams } from 'react-router-dom';

const SERVER_URL = "https://planning.negotiation.solutions/data"
//const SERVER_URL = "http://localhost:3001"

const colors = {
  primary: '#3498db',
  secondary: '#2ecc71',
  background: '#f8f9fa',
  text: '#2c3e50',
  border: '#e0e0e0',
};

const styles = {

  toggleButton_open: {
    position: 'absolute',
    top: '50%',
    left: 'calc(40% - 30px)', // Adjust based on your layout
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    zIndex: 10,
  },


  toggleButton_closed: {
    position: 'absolute',
    top: '50%',
    left: 'calc(80% - 15px)', // Adjust based on your layout
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    zIndex: 10,
  },


  app: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflowX: 'hidden',
    fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    color: colors.text,
    backgroundColor: colors.background,
  },

  chatSection_closed: {
    flex: '0 0 80%',
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },

  formSection_closed: {
    flex: '0 0 30%',
    overflowY: 'auto',
    minWidth: '50%',
    padding: '20px',
    overflowX: 'visible',
    filter: 'blur(2px) brightness(0.7)',
  },

  chatSection_open: {
    flex: '1 1 40%',
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },

  formSection_open: {
    flex: '1 1 60%',
    overflowY: 'auto',
    minWidth: '50%',
    padding: '20px',
  },

  heading: {
    color: colors.primary,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  personSection: {
    marginBottom: '30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    padding: '20px',
  },
  row: {
    marginBottom: '15px',
  },
  label: {
    minWidth: '80px',
    marginRight: '10px',
    fontWeight: 'bold',
    color: '#555',
  },
  

  input: {
    flex: 1,
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  inputOLD: {
    width: '100%',
    padding: '10px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    '&:focus': {
      borderColor: colors.primary,
      outline: 'none',
    },
  },
  button: {
    padding: '8px 12px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  topicRow: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#e74c3c',
    display: 'flex',
    alignItems: 'center',
    padding: '5px',
    marginLeft: '10px',
  },
  topicInput: {
    marginBottom: '10px',
  },
  topicLabel: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555',
  },

  chatTranscript: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  messagesContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '20px',
    scrollBehavior: 'smooth',
  },

  message: {
    marginBottom: '15px',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#f1f1f1',
  },
  chatInput: {
    display: 'flex',
    padding: '15px',
    borderTop: `1px solid ${colors.border}`,
  },
  chatInputField: {
    flex: 1,
    padding: '10px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    marginRight: '10px',
  },
};



const PersonForm = ({ personNumber, data, updateData }) => {
  const person = `person${personNumber}`;

  const updateField = (field, value) => {
    const newData = {
      ...data,
      [person]: { ...data[person], [field]: value }
    };
    updateData(newData);
  };

  const updateTopic = (index, field, value) => {
    const newData = {
      ...data,
      [person]: {
        ...data[person],
        topics: data[person].topics.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    };
    updateData(newData);
  };

  const addTopic = () => {

    const newData = {
      ...data,
      [person]: {
        ...data[person],
        topics: [...(data[person].topics || []), { topic: '', position: '', needsInterests: '' }]
      }
    };
    updateData(newData);
  };

  const deleteTopic = (index) => {
    const newData = {
      ...data,
      [person]: {
        ...data[person],
        topics: data[person].topics.filter((_, i) => i !== index)
      }
    }
    updateData(newData);
  };

  return (
    <div style={styles.personSection}>
      <h2>{personNumber === 1 ? "Self" : "Counterpart"}</h2>
      {data[person].topics.map((topic, index) => (
        <div key={index} style={styles.topicRow}>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Topic:</span>
            <input
              type="text"
              value={topic.topic}
              onChange={(e) => updateTopic(index, 'topic', e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Position:</span>
            <input
              type="text"
              value={topic.position}
              onChange={(e) => updateTopic(index, 'position', e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <span style={styles.label}>Interest:</span>
            <input
              type="text"
              value={topic.needsInterests}
              onChange={(e) => updateTopic(index, 'needsInterests', e.target.value)}
              style={styles.input}
            />
            <button onClick={() => deleteTopic(index)} style={styles.deleteButton}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
      <button style={styles.button} onClick={addTopic}>
        <Plus size={14} />
        Add Topic
      </button>
      <br/><br/>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} htmlFor={`alternative-${personNumber}`}>BATNA</label>
          <input
            id={`alternative-${personNumber}`}
            style={styles.input}
            type="text"
            value={data[person].alternative}
            onChange={(e) => updateField('alternative', e.target.value)}
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} htmlFor={`bottomLine-${personNumber}`}>RP</label>
          <input
            id={`bottomLine-${personNumber}`}
            style={styles.input}
            type="text"
            value={data[person].bottomLine}
            onChange={(e) => updateField('bottomLine', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

const ChatTranscript = ({ messages, userInput, onUserInputChange, onSendMessage, handleResetSystem, autoChatOnce, autoChatRun, isAutoChatting }) => {
  const messagesContainerRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isNearBottom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const bottomThreshold = 100; // pixels from bottom
      setIsNearBottom(scrollHeight - (scrollTop + clientHeight) <= bottomThreshold);
    }
  };

  const handleKeyPress = (event) => {
    // console.log("pressed")
    // fetch(SERVER_URL+'/saveUserInput', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userInput: userInput }),
    // });
    
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div style={styles.chatTranscript}>
      <h2>Chat With Negotiation Coach  
        <button onClick={handleResetSystem}>reset system</button>
        <button onClick={autoChatRun}>autochat {isAutoChatting ? "stop" : "start"}</button>
        <button onClick={autoChatOnce}>autochat once</button></h2>
      <div 
        ref={messagesContainerRef} 
        style={styles.messagesContainer}
        onScroll={handleScroll}
      >
        {messages.map((message, index) => (
          <div key={index} style={styles.message}>
            <strong>{message.role}:</strong> <div dangerouslySetInnerHTML={{__html: message.content}}/>
          </div>
        ))}
      </div>
      <div style={styles.chatInput}>
        <input
          type="text"
          value={userInput}
          onChange={onUserInputChange}
          onKeyPress={handleKeyPress}
          style={styles.chatInputField}
          placeholder="Type your message..."
        />
        <button onClick={onSendMessage} style={styles.button}>
          <Send size={18} />
          
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [formData, setFormData] = useState({
    person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const userId  = urlParams.get('userId')
  const sessionId  = urlParams.get('sessionId') || "UNSPECIFIED"
  console.log("Session ID from URL: " + sessionId)

  const [chatTranscript, setChatTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');

  const [initialized, setInitialized] = useState(false);

  const [formClosed, setFormClosed] = useState(1);

  const [isAutoChatting, setIsAutoChatting] = useState(false);
  

  const initialize = async () => {
    if(!initialized){
      try {
        const response = await fetch(SERVER_URL+'/initialize/'+userId+'/'+ sessionId, { method: 'POST' }); 
        setInitialized(true)
        console.log("initialized:" + initialized)
        console.log(response)
        return response;
      } catch (error) {
        console.error('Error initializing:', error);
      }  
    }
  }
  initialize()

  useEffect(() => {
    const eventSource = new EventSource(SERVER_URL+'/events/'+userId+'/'+'sessionId');
    eventSource.onmessage = (event) => {
      if (event.data !== 'connected') {
        const newData = JSON.parse(event.data);
        if (newData.formData) setFormData(newData.formData);
        if (newData.chatTranscript) setChatTranscript(newData.chatTranscript);
      }
    };
    return () => eventSource.close();
  }, []);


  const autoChatOnce = async () => {
    
      try {
        console.log("Running auto chat once...");
        const response = await fetch(SERVER_URL + '/auto-chat', { method: 'POST' });
        if (!response.ok) {
          throw new Error('Auto-chat request failed');
        }
        console.log("Auto-chat complete");
      
      } catch (error) {
        console.error('Error in auto-chat:', error);
        setIsAutoChatting(false);
      }

  }
  
  const autoChatRun = useCallback(() => {
    setIsAutoChatting(prev => !prev);
  }, []);
  

  useEffect(() => {
    if (!isAutoChatting) return;
  
    const runAutoChat = async () => {
      try {
        console.log("Running auto chat...");
        const response = await fetch(SERVER_URL + '/auto-chat', { method: 'POST' });
        if (!response.ok) {
          throw new Error('Auto-chat request failed');
        }
        console.log("Auto-chat complete");
  
        if (isAutoChatting) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runAutoChat();
        }
      } catch (error) {
        console.error('Error in auto-chat:', error);
        setIsAutoChatting(false);
      }
    };
  
    runAutoChat();
  
    return () => {
      console.log("Cleaning up auto-chat");
      // Any cleanup code if needed
    };
  }, [isAutoChatting]);


  const saveFormData = async (newData) => {
    try {
      await fetch(SERVER_URL+'/save/'+userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };


  const debouncedSaveFormData = useCallback(
    debounce(saveFormData, 500),
    []
  );


  const updateData = (newData) => {
    console.log("here")
    setFormData(newData);
    debouncedSaveFormData(newData);
  }

  // useEffect(() => {
  //   const saveFormData = async () => {
  //     try {
  //       await fetch(SERVER_URL+'/save', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(formData),
  //       });
  //     } catch (error) {
  //       console.error('Error saving form data:', error);
  //     }
  //   };
  //   saveFormData();
  // }, [formData]);




  const debouncedSaveUserInput = useCallback(
    debounce((input) => {
      
      if(input===userInput){
        fetch(SERVER_URL+'/saveUserInput/'+userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput: input }),
        });
      }
    }, 1000),
    []
  );

  const handleUserInputChange = (e) => {
    const newInput = e.target.value;
    setUserInput(newInput);
    debouncedSaveUserInput(newInput);
  };

  const handleSendMessage = async () => {
    
    // try {
    //   await fetch(SERVER_URL+'/saveUserInput/'+userId, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userInput: userInput }),
    //   });
    // } catch (error) {
    //   console.error('Error saving user input:', error);
    // }
    
    try {
      await fetch(SERVER_URL+'/runChatBot/'+userId+'/'+'sessionId', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: userInput }),
      });
    } catch (error) {
      console.error('Error running chatbot:', error);
    }

    
    
    

    setUserInput("")
  };

  const handleResetSystem = () => {
    fetch(SERVER_URL+'/reset/'+userId, { method: 'POST' });
    console.log("reset ok")
  }

  // const autoChatOnce = () => {
  //   fetch(SERVER_URL+'/auto-chat', { method: 'POST' });
  //   console.log("reset")
  // }

  const handleSetForm = () => {
    setFormClosed(prevState => prevState === 0 ? 1 : 0);
  }


  if(userId===null) {
    return("invalid URL")
  }

  return (
    <div style={styles.app}>
      <div style={formClosed===0 ? styles.chatSection_open : styles.chatSection_closed}>
        <ChatTranscript 
          messages={chatTranscript} 
          userInput={userInput}
          onUserInputChange={handleUserInputChange}
          onSendMessage={handleSendMessage}
          handleResetSystem={handleResetSystem}
          autoChatOnce={autoChatOnce}
          autoChatRun={autoChatRun}
          isAutoChatting={isAutoChatting}
        />
      </div>
      <button 
        style={formClosed===0 ? styles.toggleButton_open : styles.toggleButton_closed} 
        onClick={handleSetForm}
        aria-label={formClosed === 0 ? "Close form" : "Open form"}
      >
        {formClosed === 0 ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      <div style={formClosed===0 ? styles.formSection_open : styles.formSection_closed}>
        <h1 style={styles.heading}>Planning Doc</h1> 
        <PersonForm personNumber={1} data={formData} updateData={updateData} />
        <PersonForm personNumber={2} data={formData} updateData={updateData} />
      </div>
    </div>
  );
};

export default App;