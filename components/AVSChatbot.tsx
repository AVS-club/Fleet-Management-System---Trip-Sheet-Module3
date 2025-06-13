import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, Send, Volume2, VolumeX, X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

interface VehicleResponse {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => string;
  keywords?: string[];
}

const vehicleResponses: VehicleResponse[] = [
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `Insurance for ${matches[1].toUpperCase()} expires on 30th August 2025.`,
    keywords: ['insurance', 'बीमा']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `Driver for ${matches[1].toUpperCase()} is Rajiv Sharma (ID: D002).`,
    keywords: ['driver', 'चालक', 'ड्राइवर']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `Last trip for ${matches[1].toUpperCase()} was from Raipur to Bilaspur, 312 km, ended on 4th June.`,
    keywords: ['trip', 'यात्रा', 'last', 'पिछला']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `${matches[1].toUpperCase()} has ₹12,800 recorded maintenance expenses this month.`,
    keywords: ['maintenance', 'मरम्मत', 'खर्च', 'expense']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `The average mileage for ${matches[1].toUpperCase()} is 5.6 km/l.`,
    keywords: ['mileage', 'माइलेज', 'average', 'औसत']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `${matches[1].toUpperCase()} has an expired fitness certificate (expired May 2024).`,
    keywords: ['documents', 'कागजात', 'fitness', 'फिटनेस']
  },
  {
    pattern: /((?:mh|dl|up|mp|एमएच|डीएल|यूपी|एमपी)\d{2}[a-zए-ह]{2}\d{4})/i,
    handler: (matches) => `AVS detected high route deviation for ${matches[1].toUpperCase()} on Trip ID #T172. Needs review.`,
    keywords: ['alerts', 'अलर्ट', 'warning', 'चेतावनी']
  }
];

const predefinedResponses: Record<string, string> = {
  'how can avs help reduce repair costs?': 'By tracking trips, drivers, and part replacements, AVS spots costly patterns and helps you fix issues before they become expensive repairs.',
  'can i track which driver damages the vehicle more?': 'Yes, AVS links trip data and vehicle wear to each driver — you\'ll know who drives efficiently and who doesn\'t.',
  'can i store all my rc, insurance, and fitness docs in avs?': 'Yes! Upload photos or PDFs of your vehicle documents and AVS stores them securely, sets expiry reminders, and makes them searchable anytime.',
  'does avs help with future repair predictions?': 'Absolutely. AVS analyzes past patterns to estimate when your next tire, battery, or clutch may fail — so you can budget ahead.'
};

const AVSChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Hello! I am Bot.Ji. Please ask me about your vehicles.' }
  ]);
  const [input, setInput] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new (window as any).webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.lang = 'en-US'; // Use English for speech recognition
      
      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleVoice = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    
    // Normalize input by removing spaces and converting to lowercase
    const normalizedInput = messageText.replace(/\s+/g, '').toLowerCase();

    // Check for predefined responses first
    const lowerCaseMessage = messageText.toLowerCase();
    let botResponse: string | undefined;

    // Check for vehicle-specific queries first
    for (const response of vehicleResponses) {
      const matches = normalizedInput.match(response.pattern);
      if (matches && (!response.keywords || response.keywords.some(keyword =>
          lowerCaseMessage.includes(keyword.toLowerCase())))) {
        botResponse = response.handler(matches);
        break;
      }
    }
    
    // If no vehicle query matched, check predefined responses
    if (!botResponse) {
      // Check each predefined response for partial matches
      const matchedResponse = Object.entries(predefinedResponses).find(([key]) =>
        lowerCaseMessage.includes(key.toLowerCase())
      );
      
      if (matchedResponse) {
        botResponse = matchedResponse[1];
      } else if (lowerCaseMessage.includes('bot.ji') && lowerCaseMessage.includes('vehicles')) {
        botResponse = 'Your fleet is running well. No major alerts today. Last service was 12 days ago.';
      }
    }

    const newMessage: Message = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botMessage: Message = { 
        sender: 'bot', 
        text: botResponse || 'माफ़ कीजिये, मैं अभी जवाब नहीं दे पा रहा हूं। कृपया थोड़ी देर बाद कोशिश करें।'
      };
      setMessages(prev => [...prev, botMessage]);
      speak(botMessage.text);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: 'माफ़ कीजिये, मैं अभी जवाब नहीं दे पा रहा हूं। कृपया थोड़ी देर बाद कोशिश करें।' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isChatbotOpen && (
        <Button
          onClick={() => setIsChatbotOpen(true)}
          className="rounded-full p-3 bg-primary-600 text-white shadow-lg hover:bg-primary-700"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isChatbotOpen && (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm">
        <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          <h3 className="font-medium">Bot.Ji</h3>
        </div>
          <div className="flex items-center space-x-4">
            <p className="text-xs opacity-75">Poora AVS data, ek sawaal par – Ji.</p>
            <button
              onClick={() => setIsChatbotOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                message.sender === 'bot'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-primary-100 text-primary-800'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Input
            lang="en-US"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your vehicles..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={toggleVoice}
            className={isListening ? 'bg-primary-100' : ''}
          >
            <Mic className="h-4 w-4" />
          </Button>
          {isSpeaking ? (
            <Button variant="outline" onClick={stopSpeaking}>
              <VolumeX className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => speak(messages[messages.length - 1]?.text)}>
              <Volume2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => handleSend()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        </div>
      </div>)}
    </div>
  );
};

export default AVSChatbot;