import debounce from 'lodash/debounce';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Send } from 'lucide-react';
import NewUserForm from './components/NewUserForm';
//import { useParams } from 'react-router-dom';

const SERVER_URL = "https://planning.negotiation.solutions/data"



const ThinkingDots = () => {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 6) return '.';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block min-w-[24px]">{dots}</span>;
};

const App = () => {
  const [formData, setFormData] = useState({
    person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const userId  = urlParams.get('userId')
  const sessionId  = urlParams.get('sessionId') || "UNSPECIFIED"
  //console.log("Session ID from URL: " + sessionId)

  const [chatTranscript, setChatTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lastMessage, setLastMessage] = useState("");

  //const [initialized, setInitialized] = useState(false);
  const initializationPromise = useRef(null);

  const [firstLoad, setFirstLoad] = useState(true);

  const [formClosed, setFormClosed] = useState(1);

  const [isAutoChatting, setIsAutoChatting] = useState(false);
  
  const userInputRef = useRef('');
  const userInputFieldRef = useRef(null);  // Add this line with your other refs/state

  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo(0, messagesContainerRef.current.scrollHeight);
  };

  // Update the ref whenever userInput changes
  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);


  useEffect(()=>{

    
    
    // set isSubmitting based on state of message chain
    // note---the brief gap is filled but setIsSubmitting(true) on message send
    // console.log(chatTranscript)
    // console.log("CT: " + chatTranscript.length)
    window.chatTranscript=chatTranscript
    if(chatTranscript.length===0) return;

    const shouldBeIsSubmitting = 
      (chatTranscript.at(-1).role=="Client Negotiator") ||
      chatTranscript.at(-1).content.trim().includes("<THINKING/>")

    setIsSubmitting(shouldBeIsSubmitting);

    // // and at this point, if isSubmitting==false (SHOULD be)
    // //console.log("msg: " + newData.chatTranscript.at(-1).content)
    // console.log("!SBI: " + !shouldBeIsSubmitting)
    // console.log("UIR.current: " + userInputRef.current)
    if(!shouldBeIsSubmitting & userInputRef.current==="processing...") {
      console.log("clearing user input")
      setUserInput("")
    }

    if(shouldBeIsSubmitting) {
      setUserInput("processing...")
    }


    scrollToBottom();      
    // console.log("Before focus, active element:", document.activeElement);
    requestAnimationFrame(() => {
      userInputFieldRef.current?.focus();
    });
    // console.log("After focus, active element:", document.activeElement);
    // console.log("Is input focused?", document.activeElement === userInputFieldRef.current);

    
  }, [chatTranscript]);
  

  useEffect(() => {

  
    const initialize = async () => {
      console.log("attempting initialization")
      if (!initializationPromise.current) {
        console.log("running initialization")
        try {
          console.log("trying initialization")
          const fetchUrl = SERVER_URL + '/initialize/' + userId + '/' + sessionId;
          console.log("Fetch URL: " + fetchUrl)
          initializationPromise.current = fetch(fetchUrl, { method: 'POST' });
          
          // Wait for the fetch to complete and get the response
          const response = await initializationPromise.current;
          
          console.log("Response: " + await response.text())

        } catch (error) {
          console.error('Error initializing:', error);
          initializationPromise.current = null; // Reset on error to allow retrying
          throw error;
        }
        console.log("end initialization run")
      }
      console.log("end initialiation attempt")
    };

    initialize();

  }, []);

  useEffect(() => {
    console.log("App mounted");
    return () => console.log("App unmounted");
  }, []);

  useEffect(() => {
    
    console.log("EventSource effect running");
    const eventSource = new EventSource(SERVER_URL+'/events/'+userId+'/'+sessionId);
    eventSource.onmessage = (event) => {
      if (event.data !== 'connected') {
        const newData = JSON.parse(event.data);
        if (newData.formData) setFormData(newData.formData);
        if (newData.chatTranscript) {
          
          setChatTranscript(newData.chatTranscript);
 
        }
      }
    };
    return () => {
      console.log("EventSource effect cleanup");
      eventSource.close();
    }
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
    debounce(saveFormData, 1000),
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
      console.log("save user input")
      /*if(input===userInput){
        console.log("fetching saveUserInput")
        fetch(SERVER_URL+'/saveUserInput/'+userId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput: input }),
        });
      }*/
    }, 500),
    []
  );

  const handleUserInputChange = (e) => {
    const newInput = e.target.value;
    setUserInput(newInput);
    debouncedSaveUserInput(newInput);
  };

  const handleSendMessage = async () => {
    setIsSubmitting(true);
    scrollToBottom();
    setUserInput("processing...")
    console.log("set true: " + isSubmitting)
    try {
      await fetch(SERVER_URL+'/runChatBot/'+userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: userInput }),
      });
      
    } catch (error) {
      console.error('Error running chatbot:', error);
    }

    // scrollToBottom();
    // setIsSubmitting(false);
    console.log("set false: " + isSubmitting);
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
    return(<NewUserForm />)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
    {/* Chat Section */}
    <div className={`relative transition-all duration-300 ease-in-out border-r border-gray-200
      ${formClosed ? 'w-4/5' : 'w-2/5'}`}>
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Chat With Negotiation Coach</h2>
            <button 
              onClick={handleResetSystem}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Start New Conversation
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatTranscript.map((message, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 mb-4 max-w-[80%] ${
                message.role === 'Client Negotiator' 
                  ? 'bg-slate-200 ml-auto' // Right-aligned
                  : 'bg-indigo-100 mr-auto'  // Left-aligned
              }`}
            >
              <div className="font-medium text-sm mb-1">
                {message.role}
              </div>
              <div className="text-gray-800">
              {message.content.trim().includes("<THINKINGDOTS/>") ? (
                <>Thinking<ThinkingDots /></>
              ) : (
                <div dangerouslySetInnerHTML={{__html: message.content}} />
              )}
            </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              ref={userInputFieldRef}
              type="text"
              value={userInput}
              onChange={handleUserInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleSendMessage();
                }
              }}
              disabled={isSubmitting}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:text-gray-500 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Toggle Button */}
    <button 
      onClick={() => setFormClosed(prev => !prev)}
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-all ${
        formClosed ? 'left-[calc(80%-1rem)]' : 'left-[calc(40%-1rem)]'
      }`}
    >
      {formClosed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>

    {/* Form Section */}
    <div className={`transition-all duration-300 ${
      formClosed 
        ? 'w-1/5 opacity-50 filter blur-sm'
        : 'w-3/5 opacity-100 filter-none'
    }`}>
      <div className="h-full p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-4 mb-6">
          Planning Doc
        </h1>
        <PersonForm personNumber={1} data={formData} updateData={updateData} />
        <PersonForm personNumber={2} data={formData} updateData={updateData} />
      </div>
    </div>
  </div>
  );
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
    };
    updateData(newData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {personNumber === 1 ? "Self" : "Counterpart"}
      </h2>
      
      <div className="space-y-4">
        {data[person].topics.map((topic, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="min-w-[80px] font-medium text-gray-700">Topic:</span>
              <input
                type="text"
                value={topic.topic}
                onChange={(e) => updateTopic(index, 'topic', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="min-w-[80px] font-medium text-gray-700">Position:</span>
              <input
                type="text"
                value={topic.position}
                onChange={(e) => updateTopic(index, 'position', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="min-w-[80px] font-medium text-gray-700">Interest:</span>
              <input
                type="text"
                value={topic.needsInterests}
                onChange={(e) => updateTopic(index, 'needsInterests', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => deleteTopic(index)}
                className="p-2 text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addTopic}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Plus size={14} className="mr-2" />
          Add Topic
        </button>

        <div className="space-y-4 mt-6">
          <div>
            <label className="block font-medium text-gray-700 mb-1" htmlFor={`alternative-${personNumber}`}>
              BATNA
            </label>
            <input
              id={`alternative-${personNumber}`}
              type="text"
              value={data[person].alternative}
              onChange={(e) => updateField('alternative', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1" htmlFor={`bottomLine-${personNumber}`}>
              RP
            </label>
            <input
              id={`bottomLine-${personNumber}`}
              type="text"
              value={data[person].bottomLine}
              onChange={(e) => updateField('bottomLine', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;