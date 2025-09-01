import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  className?: string;
  buttonClassName?: string;
  title?: string;
}

const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
  onTranscript,
  language = 'hi-IN', // Default to Hindi
  className = '',
  buttonClassName = '',
  title = 'Click to dictate'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
          
        if (event.results[0].isFinal) {
          onTranscript(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
      if (import.meta.env.DEV) console.warn('Speech recognition is not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        
        if (isListening) {
          try {
            recognitionRef.current.stop();
          } catch (err) {
            console.error('Error stopping speech recognition:', err);
          }
        }
      }
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`inline-flex items-center justify-center ${
        isListening 
          ? 'text-error-600 bg-error-50 hover:bg-error-100' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      } rounded-full p-1.5 focus:outline-none transition-colors ${buttonClassName}`}
      title={title}
      aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
    >
      {isListening ? (
        <div className="relative">
          <MicOff className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500"></span>
          </span>
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
};

export default SpeechToTextButton;