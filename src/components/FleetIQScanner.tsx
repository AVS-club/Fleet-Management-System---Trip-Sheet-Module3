import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Loader2, Download } from 'lucide-react';
import { scannerService, ScannerResult } from '../utils/scannerService';

// Voice recognition hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Browser does not support speech recognition');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN'; // Indian English (supports Hinglish)
    
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, error, startListening, stopListening };
};

// Quick action chips
const QuickChips = ({ onSelect }: { onSelect: (chip: string) => void }) => {
  const chips = [
    "Expiring documents",
    "Last week fuel",
    "Today's trips",
    "Mileage stats",
    "Maintenance pending"
  ];
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {chips.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm whitespace-nowrap transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
};

// Message component
const Message = ({ message, onExport }: { message: any; onExport?: (data: any, type: string) => void }) => {
  const isUser = message.role === 'user';
  const isError = message.type === 'error';
  
  return (
    <div className={`${isUser ? 'text-right' : 'text-left'} animate-fadeIn`}>
      <div className={`inline-block p-3 rounded-lg max-w-[85%] ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : isError 
            ? 'bg-red-100 text-red-800'
            : 'bg-white shadow-sm border border-gray-200'
      }`}>
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {message.content}
        </pre>
        {message.type && message.type !== 'help' && message.type !== 'error' && message.exportable && onExport && (
          <button 
            onClick={() => onExport(message.data || message, message.type)}
            className="mt-2 text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-700 flex items-center gap-1"
          >
            <Download size={12} />
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
};

// Main FleetIQ Scanner Component
export default function FleetIQScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi! I\'m your Fleet Scanner. Ask me about:\n• Trip counts\n• Fuel expenses\n• Document expiries\n• Mileage stats\n\nTry: "How many trips for MH12AB1234 last month?" or click the mic 🎤 for voice input!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice recognition
  const { isListening, transcript, error, startListening, stopListening } = useSpeechRecognition();
  
  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle voice transcript updates
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);
  
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsProcessing(true);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Process query using the scanner service
      const result = await scannerService.processQuery(userMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.content,
        type: result.type,
        exportable: result.exportable,
        data: result.data
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Error processing query. Please try again.',
        type: 'error'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleQuickChip = (chip: string) => {
    setInput(chip);
    // Auto-send quick chips
    setTimeout(() => {
      handleSend();
    }, 100);
  };
  
  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleExport = async (data: any, type: string) => {
    try {
      const csv = await scannerService.exportToCSV(data, type);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fleet-scanner-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 hover:scale-110"
        title="Fleet Scanner"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-[400px] h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">FleetIQ Scanner</h3>
              <p className="text-xs opacity-90">Database Query Assistant</p>
            </div>
            {isListening && (
              <div className="flex items-center gap-2 bg-red-500 px-2 py-1 rounded">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs">Listening...</span>
              </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <Message 
                key={i} 
                message={msg} 
                onExport={handleExport}
              />
            ))}
            {isProcessing && (
              <div className="text-left">
                <div className="inline-flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm text-gray-600">Scanning database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Quick chips */}
          <div className="px-4 py-2 bg-white border-t">
            <QuickChips onSelect={handleQuickChip} />
          </div>
          
          {/* Input area */}
          <div className="p-4 border-t bg-white rounded-b-lg">
            {error && (
              <div className="text-xs text-red-600 mb-2">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening..." : "Ask about trips, fuel, documents..."}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isListening || isProcessing}
              />
              
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 Tip: Say "Show fuel expenses for MH12AB1234 last week"
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
