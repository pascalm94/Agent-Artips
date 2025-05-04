import { useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
}

// Declare the global SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export const useSpeechRecognition = ({ onResult, onError }: UseSpeechRecognitionProps) => {
  // Use refs instead of state to avoid React queue issues
  const isRecordingRef = useRef<boolean>(false);
  const isSupportedRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Refs for callback props to avoid dependency issues
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  
  // Update refs when props change
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Initialize speech recognition once on mount
  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition is not supported in this browser.');
      isSupportedRef.current = false;
      return;
    }
    
    try {
      const recognition = new SpeechRecognitionAPI();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR'; // Set to French
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResultRef.current(transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        onErrorRef.current(`Speech recognition error: ${event.error}`);
        isRecordingRef.current = false;
      };
      
      recognition.onend = () => {
        isRecordingRef.current = false;
      };
      
      recognitionRef.current = recognition;
      isSupportedRef.current = true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      isSupportedRef.current = false;
      onErrorRef.current('Failed to initialize speech recognition');
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error aborting speech recognition:', error);
        }
      }
    };
  }, []); // Empty dependency array to run only once

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      onErrorRef.current('Speech recognition is not available on this browser.');
      return;
    }
    
    try {
      recognitionRef.current.start();
      isRecordingRef.current = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      onErrorRef.current('Failed to start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecordingRef.current) {
      try {
        recognitionRef.current.stop();
        isRecordingRef.current = false;
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  }, []);

  return {
    isRecording: isRecordingRef.current,
    startRecording,
    stopRecording,
    isSupported: isSupportedRef.current
  };
};
