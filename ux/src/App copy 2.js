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
  // const [formData, setFormData] = useState({
  //   person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
  //   person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' }
  // });

  const [formData, setFormData] = useState({
    person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    strategy: { sourcesOfPower: '', plan: '', additionalNotes: '' }  // Add this new section
  });

  const urlParams = new URLSearchParams(window.location.search);
  const userId  = urlParams.get('userId')
  const sessionId  = urlParams.get('sessionId') || "UNSPECIFIED"
  //console.log("Session ID from URL: " + sessionId)

  const [chatTranscript, setChatTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [myVal, setMyVal] = useState(0);

  const [lastMessage, setLastMessage] = useState("");

  //const [initialized, setInitialized] = useState(false);
  const initializationPromise = useRef(null);

  const prevMessageRef = useRef(null);

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

    
    if(chatTranscript.length===0) return;

    const currentLastMessage = chatTranscript.at(-1)?.content;

    const shouldBeIsSubmitting = 
      (chatTranscript.at(-1).role==userId) ||
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


    
    console.log("ChatTranscript updated: ",  prevMessageRef.current!=currentLastMessage);
    console.log("Current : ", currentLastMessage)
    console.log("Previous: ", prevMessageRef.current)
    

    if(prevMessageRef.current !== currentLastMessage) {
      scrollToBottom();      
      requestAnimationFrame(() => {
        console.log("focus");
        userInputFieldRef.current?.focus();
      });    
    }

    prevMessageRef.current = currentLastMessage;
    // return () => {      
    //   const currentLastMessage = chatTranscript.at(-1)?.content
    //   console.log("ChatTranscript updated: ", previousLastMessage!=currentLastMessage);
    //   console.log("Current : ", currentLastMessage)
    //   console.log("Previous: ", previousLastMessage)

    //   // only run if chat Transcript is actually updated
    //   if(previousLastMessage!=currentLastMessage) {
    //     scrollToBottom();      
    //     // console.log("Before focus, active element:", document.activeElement);
    //     requestAnimationFrame(() => {
    //       console.log("focus")
    //       userInputFieldRef.current?.focus();
    //     });    
    //   }
    // };
  }, [chatTranscript]);
  

  useEffect(()=>{
    
      console.log("My val: ", myVal)
      return () => {
        // This runs BEFORE the next effect, but has access to 
        // the values from when this effect ran
        console.log("Cleaning up from when myVal was:", myVal);
      };
    
  }, [myVal]);


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

      requestAnimationFrame(() => {
        console.log("loading scroll")
        scrollToBottom();   
      });   
  
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Chat Section */}
      <div className={`relative transition-all duration-300 ease-in-out border-r border-slate-200
        ${formClosed ? 'w-4/5' : 'w-2/5'}`}>
        <div className="flex flex-col h-full">
          {/* Chat Header - Kellogg Purple */}
          <div className="bg-[#4E2A84] px-6 py-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Negotiation Coach</h2>
              <button 
                onClick={handleResetSystem}
                className="px-4 py-2 text-sm font-medium text-[#4E2A84] bg-white rounded-lg hover:bg-slate-100 border border-[#4E2A84] transition-all duration-200"
              >
                Start New Conversation
              </button>
            </div>
          </div>
  
          {/* Messages Container */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {chatTranscript.map((message, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 mb-4 max-w-[80%] shadow-sm ${
                  message.role === userId
      ? 'bg-[#F0F7FF] border border-slate-200 ml-auto'  // Light blue tint
      : 'bg-[#F6F4F9] border border-slate-200 mr-auto'  // Light purple tint
                }`}
              >
                <div className={`font-medium text-sm mb-1 ${
                  message.role === userId ? 'text-[#4E2A84]' : 'text-[#4E2A84]'
                }`}>
                  <b>{message.role}</b>
                </div>
                <div className="text-slate-800">
                  {message.content.trim().includes("<THINKINGDOTS/>") ? (
                    <div className="flex items-center space-x-2">
                      <span>Thinking</span>
                      <ThinkingDots />
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{__html: message.content}} />
                  )}
                </div>
              </div>
            ))}
          </div>
  
          {/* Chat Input */}
          <div className="bg-[#d3d3e3] border-t border-slate-200 p-4">
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
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSubmitting}
                className="px-4 py-3 bg-[#4E2A84] text-white rounded-lg hover:bg-[#836EAA] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
  
      {/* Toggle Button */}
      <button 
        onClick={() => setFormClosed(prev => !prev)}
        className={`absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#4E2A84] text-white rounded-full flex items-center justify-center hover:bg-[#836EAA] transition-all duration-200 shadow-lg ${
          formClosed ? 'left-[calc(80%-1.25rem)]' : 'left-[calc(40%-1.25rem)]'
        }`}
      >
        {formClosed ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>
  
      {/* Form Section */}
      <div className={`transition-all duration-300 ${
        formClosed 
          ? 'w-1/5 opacity-50 filter blur-sm'
          : 'w-3/5 opacity-100 filter-none'
      }`}>
        <div className="h-full p-6 overflow-y-auto">
          <h1 className="text-3xl font-bold text-[#4E2A84] border-b border-slate-200 pb-4 mb-6">
            Planning Document
          </h1>
          <PersonForm personNumber={1} data={formData} updateData={updateData} />
          <PersonForm personNumber={2} data={formData} updateData={updateData} />
          
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
            <h2 className="text-2xl font-bold text-[#4E2A84] mb-6">
              Strategy
            </h2>
            
            <div className="space-y-6">
              {/* Strategy inputs remain the same, just update input classes to match others */}
            </div>
          </div>
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
    // Update the main form container
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
      <h2 className="text-2xl font-bold text-[#4E2A84] mb-6">
        {personNumber === 1 ? "Self" : "Counterpart"}
      </h2>
      
      <div className="space-y-6">
        {data[person].topics.map((topic, index) => (
          <div key={index} className="bg-[#F8F7FA] rounded-lg p-5 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Topic:</span>
              <input
                type="text"
                value={topic.topic}
                onChange={(e) => updateTopic(index, 'topic', e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Position:</span>
              <input
                type="text"
                value={topic.position}
                onChange={(e) => updateTopic(index, 'position', e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Interest:</span>
              <input
                type="text"
                value={topic.needsInterests}
                onChange={(e) => updateTopic(index, 'needsInterests', e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={() => deleteTopic(index)}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addTopic}
          className="flex items-center px-4 py-2 text-sm font-medium text-[#4E2A84] bg-[#F6F4F9] rounded-lg hover:bg-[#836EAA] hover:text-white transition-all duration-200"
        >
          <Plus size={16} className="mr-2" />
          Add Topic
        </button>

        <div className="space-y-6 mt-6">
          <div>
            <label className="block font-medium text-[#4E2A84] mb-2" htmlFor={`alternative-${personNumber}`}>
              BATNA (Best Alternative to Negotiated Agreement)
            </label>
            <input
              id={`alternative-${personNumber}`}
              type="text"
              value={data[person].alternative}
              onChange={(e) => updateField('alternative', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block font-medium text-[#4E2A84] mb-2" htmlFor={`bottomLine-${personNumber}`}>
              Reservation Point
            </label>
            <input
              id={`bottomLine-${personNumber}`}
              type="text"
              value={data[person].bottomLine}
              onChange={(e) => updateField('bottomLine', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;