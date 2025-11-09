import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X } from 'lucide-react';
import config from '../../utils/env';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SpeechToTextButton');

// Global state to track active speech recognition instance
// This prevents multiple voice scripters from running simultaneously
let activeRecognitionInstance: any = null;
let activeInstanceId: string | null = null;

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void; // For real-time updates
  onStart?: () => void; // Called when recording starts (for focusing textarea)
  language?: string;
  className?: string;
  buttonClassName?: string;
  title?: string;
  maxDuration?: number; // Max recording duration in milliseconds (default: 10000ms = 10s)
}

// Language label mapping
const LANGUAGE_LABELS: Record<string, string> = {
  'hi-IN': 'हिं',  // Hindi in Devanagari
  'mr-IN': 'मरा',  // Marathi in Devanagari
  'en-IN': 'EN',   // English
  'en-US': 'EN',
  'ta-IN': 'த',    // Tamil
  'te-IN': 'తె',   // Telugu
  'kn-IN': 'ಕನ್ನ',  // Kannada
};

const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
  onTranscript,
  onInterimTranscript,
  onStart,
  language = 'hi-IN', // Default to Hindi
  buttonClassName = '',
  title = 'Click to dictate',
  maxDuration = 10000 // Default 10 seconds
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const onStartRef = useRef(onStart);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random()}`);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onInterimTranscriptRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        console.log('🎤 SPEECH RECOGNITION ONRESULT TRIGGERED', event);
        let finalTranscript = '';
        let interimTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('✅ FINAL TRANSCRIPT:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ INTERIM TRANSCRIPT:', transcript);
          }
        }

        // Send interim results for real-time display
        if (interimTranscript && onInterimTranscriptRef.current) {
          console.log('📤 SENDING INTERIM TO CALLBACK:', interimTranscript);
          onInterimTranscriptRef.current(interimTranscript);
        }

        // Handle final results
        if (finalTranscript.trim()) {
          console.log('📤 SENDING FINAL TO CALLBACK:', finalTranscript.trim());
          onTranscriptRef.current(finalTranscript.trim());
          setStatus('success');
          setIsListening(false);
          
          // Clear active instance if this was the active one
          if (activeInstanceId === instanceIdRef.current) {
            activeRecognitionInstance = null;
            activeInstanceId = null;
          }

          // Clear success status after 2 seconds
          if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
          }
          statusTimeoutRef.current = setTimeout(() => {
            setStatus('idle');
          }, 2000);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ SPEECH RECOGNITION ERROR:', event.error, event);
        setIsListening(false);
        setStatus('error');

        // Clear active instance if this was the active one
        if (activeInstanceId === instanceIdRef.current) {
          activeRecognitionInstance = null;
          activeInstanceId = null;
        }

        // Clear error status after 2 seconds
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        statusTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
        }, 2000);
      };

      recognitionRef.current.onstart = () => {
        console.log('🎙️ SPEECH RECOGNITION ONSTART EVENT FIRED');
      };

      recognitionRef.current.onend = () => {
        console.log('🛑 SPEECH RECOGNITION ONEND EVENT FIRED');
        setIsListening(false);
        // Clear active instance if this was the active one
        if (activeInstanceId === instanceIdRef.current) {
          activeRecognitionInstance = null;
          activeInstanceId = null;
        }
      };
    } else {
      setIsSupported(false);
      if (config.isDev) logger.warn('Speech recognition is not supported in this browser');
    }

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }

      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;

        if (isListening) {
          try {
            recognitionRef.current.stop();
          } catch (err) {
            logger.error('Error stopping speech recognition:', err);
          }
          // Clear active instance if this was the active one
          if (activeInstanceId === instanceIdRef.current) {
            activeRecognitionInstance = null;
            activeInstanceId = null;
          }
        }
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      // Stop listening immediately
      // Clear auto-stop timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }

      try {
        recognitionRef.current.stop();
        setIsListening(false);
        // Clear active instance if this was the active one
        if (activeInstanceId === instanceIdRef.current) {
          activeRecognitionInstance = null;
          activeInstanceId = null;
        }
      } catch (err) {
        logger.error('Error stopping speech recognition:', err);
        // Still update state even if stop() throws
        setIsListening(false);
        if (activeInstanceId === instanceIdRef.current) {
          activeRecognitionInstance = null;
          activeInstanceId = null;
        }
      }
    } else {
      // Check if another instance is already active
      if (activeRecognitionInstance && activeInstanceId !== instanceIdRef.current) {
        // Stop the other active instance first
        try {
          activeRecognitionInstance.stop();
        } catch (err) {
          logger.error('Error stopping other active recognition:', err);
        }
        activeRecognitionInstance = null;
        activeInstanceId = null;
      }

      try {
        console.log('🎬 STARTING SPEECH RECOGNITION...', { language });
        recognitionRef.current.start();
        console.log('✅ recognition.start() called successfully');
        setIsListening(true);
        // Set this as the active instance
        activeRecognitionInstance = recognitionRef.current;
        activeInstanceId = instanceIdRef.current;

        // Call onStart callback to focus the textarea
        if (onStartRef.current) {
          console.log('🎯 CALLING onStart CALLBACK');
          onStartRef.current();
        }

        // Set auto-stop timeout
        autoStopTimeoutRef.current = setTimeout(() => {
          console.log(`⏱️ AUTO-STOPPING after ${maxDuration}ms`);
          try {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.stop();
            }
          } catch (err) {
            console.error('Error auto-stopping:', err);
          }
        }, maxDuration);

        console.log('✅ SPEECH RECOGNITION STARTED');
      } catch (err) {
        console.error('❌ ERROR STARTING SPEECH RECOGNITION:', err);
        // If start fails, make sure state is clean
        setIsListening(false);
        if (activeInstanceId === instanceIdRef.current) {
          activeRecognitionInstance = null;
          activeInstanceId = null;
        }
      }
    }
  };

  if (!isSupported) {
    return null; // Don't render anything if not supported
  }

  const languageLabel = LANGUAGE_LABELS[language] || language.split('-')[0].toUpperCase();

  // Determine button styling based on status
  const getButtonStyles = () => {
    if (isListening) {
      return 'bg-red-500 hover:bg-red-600 text-white border-red-600';
    }
    if (status === 'success') {
      return 'bg-green-500 text-white border-green-600';
    }
    if (status === 'error') {
      return 'bg-red-500 text-white border-red-600';
    }
    return 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300';
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all duration-200 text-xs font-medium ${getButtonStyles()} ${buttonClassName}`}
      title={title}
      aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
    >
      {/* Language Label */}
      <span className="font-semibold min-w-[20px] text-center">
        {languageLabel}
      </span>

      {/* Icon/Status Indicator */}
      {isListening ? (
        <div className="relative">
          <MicOff className="h-3.5 w-3.5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </span>
        </div>
      ) : status === 'success' ? (
        <Check className="h-3.5 w-3.5" />
      ) : status === 'error' ? (
        <X className="h-3.5 w-3.5" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

export default SpeechToTextButton;