import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';



const colors = {
  primary: '#3498db',
  secondary: '#2ecc71',
  background: '#f8f9fa',
  text: '#2c3e50',
  border: '#e0e0e0',
};

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    color: colors.text,
    backgroundColor: colors.background,
  },
  chatSection: {
    flex: 1,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  formSection: {
    flex: 1,
    overflowY: 'auto',
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
    flexGrow: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: 'white',
    overflowAnchor: 'none',
  },
  anchor: {
    overflowAnchor: 'auto',
    height: '1px',
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
    updateData(prevData => ({
      ...prevData,
      [person]: { ...prevData[person], [field]: value }
    }));
  };

  const updateTopic = (index, field, value) => {
    updateData(prevData => ({
      ...prevData,
      [person]: {
        ...prevData[person],
        topics: prevData[person].topics.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const addTopic = () => {
    updateData(prevData => ({
      ...prevData,
      [person]: {
        ...prevData[person],
        topics: [...prevData[person].topics, { topic: '', position: '', needsInterests: '' }]
      }
    }));
  };

  const deleteTopic = (index) => {
    updateData(prevData => ({
      ...prevData,
      [person]: {
        ...prevData[person],
        topics: prevData[person].topics.filter((_, i) => i !== index)
      }
    }));
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
        Add Row
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

const ChatTranscript = ({ messages, userInput, onUserInputChange, onSendMessage }) => (
  <div style={styles.chatTranscript}>
    <h2>Chat Transcript</h2>
    {messages.map((message, index) => (
      <div key={index} style={styles.message}>
        <strong>{message.role}:</strong> {message.content}
      </div>
    ))}
    <div style={styles.chatInput}>
      <input
        type="text"
        value={userInput}
        onChange={onUserInputChange}
        style={styles.chatInputField}
        placeholder="Type your message..."
      />
      <button onClick={onSendMessage} style={styles.button}>
        <Send size={18} />
        Send
      </button>
    </div>
    <div style={styles.anchor}>&nbsp;</div>
  </div>
  
);


const App = () => {
  const [formData, setFormData] = useState({
    person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' }
  });
  const [chatTranscript, setChatTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/events');
    eventSource.onmessage = (event) => {
      if (event.data !== 'connected') {
        const newData = JSON.parse(event.data);
        if (newData.formData) setFormData(newData.formData);
        if (newData.chatTranscript) setChatTranscript(newData.chatTranscript);
        if (newData.userInput) setUserInput(newData.userInput);
      }
    };
    return () => eventSource.close();
  }, []);

  useEffect(() => {
    const saveFormData = async () => {
      try {
        await fetch('http://localhost:3001/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    };
    saveFormData();
  }, [formData]);

  const handleUserInputChange = (e) => {
    const newInput = e.target.value;
    setUserInput(newInput);
    fetch('http://localhost:3001/saveUserInput', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: newInput }),
    });
  };

  const handleSendMessage = () => {
    fetch('http://localhost:3001/runChatBot', { method: 'POST' });
    setUserInput("");
  };

  return (
    <div style={styles.app}>
      <div style={styles.chatSection}>
        <ChatTranscript 
          messages={chatTranscript} 
          userInput={userInput}
          onUserInputChange={handleUserInputChange}
          onSendMessage={handleSendMessage}
        />
      </div>
      <div style={styles.formSection}>
        <h1 style={styles.heading}>Planning Doc</h1>
        <PersonForm personNumber={1} data={formData} updateData={setFormData} />
        <PersonForm personNumber={2} data={formData} updateData={setFormData} />
      </div>
    </div>
  );
};

export default App;