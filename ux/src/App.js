import debounce from 'lodash/debounce';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Send } from 'lucide-react';
import NewUserForm from './components/NewUserForm';
//import { useParams } from 'react-router-dom';

const SERVER_URL = "https://planning.negotiation.solutions/data"


const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-white/50" 
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg border-2 border-[#4E2A84] shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

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
  const [showInstructions, setShowInstructions] = useState(true);

  const [formData, setFormData] = useState({
    person1: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    person2: { topics: [{ topic: '', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
    strategy: { sourcesOfPower: '', plan: '', additionalNotes: '' }  // Add this new section
  });

  const urlParams = new URLSearchParams(window.location.search);
  const userId  = urlParams.get('userId')
  const userName = urlParams.get('userName')
  const sessionId  = urlParams.get('sessionId') || "UNSPECIFIED"
  //console.log("Session ID from URL: " + sessionId)

  const [chatTranscript, setChatTranscript] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);



  //const [initialized, setInitialized] = useState(false);
  const initializationPromise = useRef(null);

  const prevMessageRef = useRef(null);

  const [showResetConfirmation, setShowResetConfirmation] = useState(false);


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
      (chatTranscript.at(-1).role==userName) ||
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
        // Check if any form element has focus
        const activeElement = document.activeElement;
        const isFormElement = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
        
        // Only focus chat input if no form element is focused
        if (!isFormElement) {
          console.log("focus");
          userInputFieldRef.current?.focus();
        }
      });    
    }

    prevMessageRef.current = currentLastMessage;

  }, [chatTranscript]);
  

 


  useEffect(() => {

  
    const initialize = async () => {
      console.log("attempting initialization")
      if (!initializationPromise.current) {
        console.log("running initialization")
        try {
          console.log("trying initialization")
          const fetchUrl = SERVER_URL + '/initialize/' + userId + '/' + sessionId + '/' + userName;
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

  const debouncedSaveFormData = useCallback(
    debounce((newData) => {
      fetch(SERVER_URL+'/save/'+userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      }).catch(error => {
        console.error('Error saving form data:', error);
      });
    }, 3000),
    [userId]
  );
  
  const updateData = useCallback((newData) => {
    // Immediate local update
    setFormData(newData);
    
    // Debounced server update - remove the .catch() here
    debouncedSaveFormData(newData);
  }, [debouncedSaveFormData]);

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

    setShowResetConfirmation(false);
    fetch(SERVER_URL+'/reset/'+userId, { method: 'POST' });
    updateData({
      person1: { topics: [{ topic: '', priority:'', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
      person2: { topics: [{ topic: '', priority:'', position: '', needsInterests: '' }], alternative: '', bottomLine: '' },
      strategy: { sourcesOfPower: '', plan: '', additionalNotes: '' }
    })
    console.log("reset ok")
  }



  // First, add this function near your other handlers in App.js
  const handleExport = () => {
    const printContent = `
      <html>
        <head>
          <title>Negotiation Planning Document</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 30px; 
              line-height: 1.6;
              max-width: 1000px;
              margin: 0 auto;
            }
            h1 { 
              color: #4E2A84; 
              margin-bottom: 30px;
              font-size: 24px;
            }
            h2 { 
              color: #4E2A84; 
              margin-top: 30px;
              font-size: 20px;
            }
            .card {
              border: 1px solid #e2e2e2;
              border-radius: 6px;
              padding: 24px;
              margin-bottom: 24px;
            }
            .topic {
              border: 1px solid #e2e2e2;
              border-radius: 4px;
              padding: 16px;
              margin-bottom: 16px;
            }
            .topic-item {
              margin-bottom: 12px;
            }
            .topic-item:last-child {
              margin-bottom: 0;
            }
            .label {
              font-weight: bold;
              color: #4E2A84;
              display: inline-block;
              width: 100px;
            }
            .section {
              margin-bottom: 16px;
            }
            @media print {
              body { padding: 20px; }
              .card { break-inside: avoid; }
              .topic { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Negotiation Planning Document</h1>
          
          <div class="card">
            <h2>Self</h2>
            ${formData.person1.topics.map(topic => `
              <div class="topic">
                <div class="topic-item"><span class="label">Topic:</span> ${topic.topic}</div>
                <div class="topic-item"><span class="label">Position:</span> ${topic.position}</div>
                <div class="topic-item"><span class="label">Interest:</span> ${topic.needsInterests}</div>
              </div>
            `).join('')}
            <div class="section">
              <div class="topic-item"><span class="label">BATNA:</span> ${formData.person1.alternative}</div>
              <div class="topic-item"><span class="label">Reservation:</span> ${formData.person1.bottomLine}</div>
            </div>
          </div>
  
          <div class="card">
            <h2>Counterpart</h2>
            ${formData.person2.topics.map(topic => `
              <div class="topic">
                <div class="topic-item"><span class="label">Topic:</span> ${topic.topic}</div>
                <div class="topic-item"><span class="label">Position:</span> ${topic.position}</div>
                <div class="topic-item"><span class="label">Interest:</span> ${topic.needsInterests}</div>
              </div>
            `).join('')}
            <div class="section">
              <div class="topic-item"><span class="label">BATNA:</span> ${formData.person2.alternative}</div>
              <div class="topic-item"><span class="label">Reservation:</span> ${formData.person2.bottomLine}</div>
            </div>
          </div>
  
          <div class="card">
            <h2>Strategy</h2>
            <div class="section">
              <div class="topic-item"><span class="label">Power:</span> ${formData.strategy.sourcesOfPower}</div>
              <div class="topic-item"><span class="label">Plan:</span> ${formData.strategy.plan}</div>
              <div class="topic-item"><span class="label">Notes:</span> ${formData.strategy.additionalNotes}</div>
            </div>
          </div>
        </body>
      </html>
    `;
  
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if(userId===null || userName===null) {
    return(<NewUserForm />)
  }


  // Confirm before resetting
  const resetModal = 
    <Modal isOpen={showResetConfirmation} onClose={() => setShowResetConfirmation(false)}>
      <h2 className="text-2xl font-bold text-[#4E2A84] mb-6">Start New Chat</h2>
      
      <div className="space-y-4">
        <p>Are you sure you want to start a new chat? This will clear all your current data.</p>
        
        <div className="flex justify-end space-x-4 mt-8">
          <button 
            onClick={() => setShowResetConfirmation(false)}
            className="px-6 py-2 text-[#4E2A84] border border-[#4E2A84] rounded-lg hover:bg-slate-100 transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            onClick={handleResetSystem}
            className="px-6 py-2 bg-[#4E2A84] text-white rounded-lg hover:bg-[#836EAA] transition-all duration-200"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>

  const myModal = 
    <>
      <Modal isOpen={showInstructions} onClose={() => setShowInstructions(false)}>
        <h2 className="text-2xl font-bold text-[#4E2A84] mb-6">Welcome to your AI Negotiation Coach</h2>
        
        <div className="space-y-4">
          <p>This tool helps you prepare for negotiations by:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Asking questions to explore the situation</li>
            <li>Helping you topics, positions, and interests for both parties</li>
            <li>Guiding you to fill out a planning doc and make a strategy</li>
          </ul>

          <div className="bg-[#F6F3FB] p-4 rounded-lg mt-6">
            <h3 className="font-semibold text-[#4E2A84] mb-2">How to use this tool:</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Chat with the AI coach on the left</li>
              <li>Fill out the form on the right</li>
              <li>Toggle the form view using the arrow button in the middle</li>
              <li>Export your completed plan using the "Export to PDF" button</li>
            </ol>
          </div>
          <div className="pt-2">This app is in beta testing as of Nov 12th.
            <br/><br/><b>Send all feedback to:</b> joshua.becker@ucl.ac.uk</div>
        </div>

        <button 
          onClick={() => setShowInstructions(false)}
          className="mt-8 px-6 py-2 bg-[#4E2A84] text-white rounded-lg hover:bg-[#836EAA] transition-all duration-200"
        >
          Get Started
        </button>
      </Modal>
    </>

  return (
    <>
      {myModal}{resetModal}
      <div className="flex flex-col lg:flex-row h-screen bg-slate-50 overflow-hidden">
        {/* Chat Section */}
        <div className={`relative transition-all duration-300 ease-in-out border-b lg:border-b-0 lg:border-r border-slate-200
          ${formClosed ? 'h-[85vh] lg:h-screen lg:w-4/5' : 'h-[15vh] lg:h-screen lg:w-2/5'}`}>
          <div className="flex flex-col h-full">
            {/* Chat Header - Kellogg Purple */}
            <div className="bg-[#4E2A84] px-6 py-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">Negotiation Coach</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowInstructions(true)}
                    className="px-4 py-2 text-sm font-medium text-[#4E2A84] bg-white rounded-lg hover:bg-slate-100 border border-[#4E2A84] transition-all duration-200"
                  >
                    Instructions
                  </button>
                  <button 
                    onClick={() => setShowResetConfirmation(true)}
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-[#4E2A84] bg-white rounded-lg hover:bg-slate-100 border border-[#4E2A84] transition-all duration-200"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            </div>
    
    
            {/* Messages Container */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
              {chatTranscript.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 mb-4 max-w-[80%] shadow-sm ${
                    message.role !== "Negotiation Coach"
        ? 'bg-[#F6F4F9] border border-slate-200 ml-auto'  // Light blue tint
        : 'bg-[#F0F2FF] border border-slate-200 mr-auto'  // Light purple tint
                  }`}
                >
                  <div className={`font-medium text-sm mb-1 ${
                    message.role !== "Negotiation Coach" ? 'text-[#4E2A84]' : 'text-[#4E2A84]'
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
            <div className="bg-[#FAFBFF] border-t border-slate-200 p-4">
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
          className={`absolute z-10 w-10 h-10 bg-[#4E2A84] text-white rounded-full flex items-center justify-center hover:bg-[#836EAA] transition-all duration-200 shadow-lg 
            ${formClosed 
              ? 'top-[calc(85vh-1.25rem)] left-1/2 -translate-x-1/2 rotate-90 lg:rotate-0 lg:left-[calc(80%-1.25rem)] lg:top-1/2 lg:-translate-y-1/2' 
              : 'top-[calc(15vh-1.25rem)] left-1/2 -translate-x-1/2 rotate-90 lg:rotate-0 lg:left-[calc(40%-1.25rem)] lg:top-1/2 lg:-translate-y-1/2'
            }`}
        >
          {formClosed ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
    
        {/* Form Section */}
        <div className={`transition-all duration-300 overflow-y-auto
          ${formClosed 
            ? 'h-[15vh] lg:h-screen lg:w-1/5 opacity-50 filter blur-sm'
            : 'h-[85vh] lg:h-screen lg:w-3/5 opacity-100 filter-none'
          }`}>
          <div className="h-full p-5 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
              <h1 className="text-3xl font-bold text-[#4E2A84]">
                Planning Document
              </h1>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-[white] text-[#4E2A84] rounded-lg hover:bg-slate-100 transition-all duration-200 flex items-center justify-center space-x-2 shadow"
              >
                <span><b>Export to PDF</b></span>
              </button>
            </div>
            <PersonForm personNumber={1} data={formData} updateData={updateData} />
            <PersonForm personNumber={2} data={formData} updateData={updateData} />
            
            <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-[#d3c7fc]">
              <h2 className="text-xl font-bold text-[#4E2A84] m-0 mb-3 leading-none pt-2 pl-0">
                Strategy
              </h2>
              
              <div className="space-y-6">
                {/* Strategy inputs remain the same, just update input classes to match others */}        
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium text-[#4E2A84] mb-2">
                      What are your sources of power?
                    </label>
                    <input
                      type="text"
                      value={formData.strategy.sourcesOfPower}
                      onChange={(e) => updateData({
                        ...formData,
                        strategy: { ...formData.strategy, sourcesOfPower: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#4E2A84] mb-2">
                      What is your first offer?
                    </label>
                    <input
                      type="text"
                      value={formData.strategy.plan}
                      onChange={(e) => updateData({
                        ...formData,
                        strategy: { ...formData.strategy, plan: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#4E2A84] mb-2">
                      Additional Notes (strategy, etc.)
                    </label>
                    <textarea
                      value={formData.strategy.additionalNotes}
                      onChange={(e) => updateData({
                        ...formData,
                        strategy: { ...formData.strategy, additionalNotes: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px] resize-y"
                      placeholder="Enter any additional notes about your strategy..."
                    />
                  </div>
                </div>
              
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
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
    // For priority field, ensure value is between 0 and 100
    if (field === 'priority') {
      // Remove leading zeros and ensure value is between 0 and 100
      value = value.replace(/^0+/, '') || '0';  // Replace leading zeros but keep single '0'
      value = Math.min(100, Math.max(0, Number(value) || 0));
    }    
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
        topics: [...(data[person].topics || []), { topic: '', priority: '', position: '', needsInterests: '' }]
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
    <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-[#d3c7fc]">
      <h2 className="text-xl font-bold text-[#4E2A84] m-0 mb-3 leading-none pt-2 pl-2">
        {personNumber === 1 ? "Self" : "Counterpart"}
      </h2>
      <div className="space-y-3">
        {data[person].topics.map((topic, index) => (
          <div key={index} className="bg-[#F8F7FA] rounded-lg p-3 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Topic:</span>
              <input
                type="text"
                value={topic.topic}
                onChange={(e) => updateTopic(index, 'topic', e.target.value)}
                className="flex-1 px-1.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
              />
              <span className="min-w-[80px] font-medium text-[#4E2A84] ml-4 text-right">Priority:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={topic.priority}
                onChange={(e) => updateTopic(index, 'priority', e.target.value)}
                className="w-[5rem] px-1.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0-100"
              />
              <span className="text-slate-500">%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Position:</span>
              <input
                type="text"
                value={topic.position}
                onChange={(e) => updateTopic(index, 'position', e.target.value)}
                className="flex-1 px-1.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="min-w-[80px] font-medium text-[#4E2A84]">Interest:</span>
              <input
                type="text"
                value={topic.needsInterests}
                onChange={(e) => updateTopic(index, 'needsInterests', e.target.value)}
                className="flex-1 px-1.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200"
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

        <div className="space-y-4 mt-6">
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