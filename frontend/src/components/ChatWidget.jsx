import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import axios from 'axios';
import { 
  FaTimes, 
  FaPaperPlane, 
  FaUser, 
  FaTrashAlt, 
  FaRobot,
  FaCalendarAlt,
  FaCheckCircle,
  FaCreditCard,
  FaLanguage
} from 'react-icons/fa';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Ayubowan! 👋 I am LuminaChat, your virtual assistant. Ask me anything about class schedules, teachers, hotline, attendance, or payments.\n\n*(සිංහලෙන් හෝ Singlish වලිනුත් අසන්න හැක!)*'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (userMessageText) => {
    const textToSend = userMessageText || input;
    if (!textToSend || !textToSend.trim() || loading) return;

    const query = textToSend.trim();
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    if (!userMessageText) setInput('');
    setLoading(true);

    try {
      // Primary API call using configured api utility (includes Bearer Token)
      let res;
      try {
        res = await api.post('/chat', { message: query });
      } catch (primaryErr) {
        // Direct Axios fallback
        const token = localStorage.getItem('token');
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        res = await axios.post(
          `${baseURL}/chat`,
          { message: query },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const botReply = res.data?.reply || 'Sorry, I could not retrieve a response right now.';
      setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    } catch (err) {
      console.error('ChatWidget Error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.reply || 'Error communicating with LuminaChat server.';
      setMessages(prev => [
        ...prev, 
        { sender: 'bot', text: `⚠️ ${errMsg}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: 'Chat cleared! Ayubowan! 👋 How can I help you today?'
      }
    ]);
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  // Helper to format bot responses with basic markdown formatting
  const formatText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      // Replace bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={lIdx} className="block min-h-[1rem]">
          {formattedParts}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* --- FLOATING TOGGLE BUTTON WITH FAROBOT ICON --- */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-110 group cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300"
          title="Open LuminaChat Assistant"
        >
          <FaRobot className="text-2xl transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>
        </button>
      ) : (

        /* --- EMBEDDED POPUP CHAT CONTAINER --- */
        <div className="w-[340px] sm:w-[380px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col border border-purple-100 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white p-4 flex justify-between items-center shadow-md relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white overflow-hidden p-0.5 shadow-sm">
                <img 
                  src="/assets/LuminaChat_Icon.png" 
                  alt="LuminaChat Avatar" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  LuminaChat AI <span className="text-[10px] bg-emerald-400 text-purple-950 font-extrabold px-1.5 py-0.2 rounded-full uppercase">Online</span>
                </h3>
                <p className="text-[11px] text-purple-100 opacity-90">English • සිංහල • Singlish</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
                title="Clear Chat"
              >
                <FaTrashAlt className="text-xs" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white cursor-pointer text-base leading-none"
                title="Minimize Chat"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="bg-purple-50/80 px-3 py-2 border-b border-purple-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => handleQuickPrompt("When are the class schedules?")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <FaCalendarAlt className="text-[10px]" /> Schedules
            </button>
            <button
              onClick={() => handleQuickPrompt("What is my attendance status?")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <FaCheckCircle className="text-[10px]" /> Attendance
            </button>
            <button
              onClick={() => handleQuickPrompt("Check my payment records")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <FaCreditCard className="text-[10px]" /> Payments
            </button>
            <button
              onClick={() => handleQuickPrompt("mata grade 10 science panthiya yanne kawadada?")}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <FaLanguage className="text-[10px]" /> Singlish Help
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <img
                    src="/assets/LuminaChat_Icon.png"
                    alt="LuminaChat Avatar"
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5 shadow-sm border border-purple-200 bg-purple-50"
                  />
                )}
                
                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none shadow-md'
                      : 'bg-white text-gray-800 border border-gray-200/80 shadow-sm rounded-tl-none'
                  }`}
                >
                  {formatText(msg.text)}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-sm">
                    <FaUser />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 justify-start">
                <img
                  src="/assets/LuminaChat_Icon.png"
                  alt="LuminaChat Avatar"
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 shadow-sm border border-purple-200 bg-purple-50"
                />
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-gray-400 ml-1 italic">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form / Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question (English or Singlish)..."
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              title="Send Message"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
