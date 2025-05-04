import { useState, useEffect, useCallback, useRef } from 'react';

// Define the audible prefix - Apply only to the first chunk
const AUDIBLE_PREFIX = "Lecture en cours : ";

export const useSpeechSynthesis = () => {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isInitializedRef = useRef(false);
  const voicesLoadedRef = useRef(false);
  // Removed: const [voicesLoadedState, setVoicesLoadedState] = useState(false);

  // Refs for chunking mechanism
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceIndexRef = useRef<number>(0);
  const isCancellingRef = useRef<boolean>(false); // Flag to prevent race conditions on cancel/end

  // Function to determine voice gender (remains the same)
  const determineGender = (voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' => {
    const name = voice.name.toLowerCase();
    if (name.includes('female') || name.includes('femme') || name.includes('woman') || name.includes('girl')) return 'female';
    if (name.includes('male') || name.includes('homme') || name.includes('man') || name.includes('boy')) return 'male';
    // Add more specific names if needed
    if (name.includes('audrey') || name.includes('aurelie') || name.includes('amelie') || name.includes('joana') || name.includes('louise') || name.includes('virginie') || name.includes('marie') || name.includes('celine') || name.includes('elise') || name.includes('sophie')) return 'female';
    if (name.includes('thomas') || name.includes('nicolas') || name.includes('jean') || name.includes('pierre') || name.includes('michel') || name.includes('bernard') || name.includes('jacques') || name.includes('philippe')) return 'male';
    return 'unknown';
  };

  // Function to determine voice quality score (remains the same)
  const getVoiceQualityScore = (voice: SpeechSynthesisVoice): number => {
    const name = voice.name.toLowerCase();
    let score = 0;
    if (name.includes('google')) score += 100;
    if (name.includes('microsoft')) score -= 50; // Penalize Microsoft voices slightly less?
    if (!voice.localService) score += 20;
    if (determineGender(voice) === 'female') score += 30;
    if (voice.lang.startsWith('fr')) score += 25;
    else if (voice.lang.includes('fr')) score += 10;
    return score;
  };

  // Process available voices (remains largely the same)
  const processVoices = useCallback(() => {
    if (!synthesisRef.current) return;
    const availableVoices = synthesisRef.current.getVoices();
    if (availableVoices.length === 0) return; // Wait for voices

    // Debounce or prevent reprocessing if voices haven't changed significantly
    // Check ref instead of state
    if (voicesRef.current.length === availableVoices.length && voicesLoadedRef.current) {
      return;
    }

    voicesRef.current = availableVoices;
    console.log('Processing voices. Available:', availableVoices.length);
    const frenchVoices = availableVoices.filter(v => v.lang.includes('fr'));
    const scoredVoices = frenchVoices.map(voice => ({ voice, score: getVoiceQualityScore(voice) }));
    scoredVoices.sort((a, b) => b.score - a.score);

    let bestVoice: SpeechSynthesisVoice | null = null;
    const googleVoice = frenchVoices.find(v => v.name.toLowerCase().includes('google') && v.lang.includes('fr'));

    if (googleVoice) {
      bestVoice = googleVoice;
      console.log('Selected Google voice:', googleVoice.name);
    } else if (scoredVoices.length > 0) {
      bestVoice = scoredVoices[0].voice;
      console.log('Selected best available non-Google voice:', bestVoice.name);
    } else {
      console.warn('No suitable French voice found.');
      // Fallback to any available voice?
      bestVoice = availableVoices.find(v => v.lang.startsWith('fr')) || availableVoices[0] || null;
      if (bestVoice) console.log('Using fallback voice:', bestVoice.name);
    }

    selectedVoiceRef.current = bestVoice;
    if (!voicesLoadedRef.current) {
        voicesLoadedRef.current = true;
        // Removed: setVoicesLoadedState(true); // Trigger state update only once
        console.log('Voices marked as loaded.');
    }
  }, []); // Keep empty dependency array

  // Initialize speech synthesis (remains largely the same)
  const initializeSpeechSynthesis = useCallback(() => {
    if (!isInitializedRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
      setIsSupported(true);
      isInitializedRef.current = true;
      console.log('Speech synthesis initializing...');

      // Attempt to populate voices immediately
      processVoices();

      // Listen for changes (important for some browsers)
      if (synthesisRef.current.onvoiceschanged !== undefined) {
        synthesisRef.current.onvoiceschanged = processVoices;
      } else {
         // If onvoiceschanged is not supported, try a small delay
         setTimeout(processVoices, 100);
      }

    } else if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported by this browser.');
      setIsSupported(false);
    }
  }, [processVoices]); // Dependency on processVoices is correct

  // Initialize on mount
  useEffect(() => {
    initializeSpeechSynthesis();
    return () => {
      // Cleanup
      if (synthesisRef.current) {
        synthesisRef.current.onvoiceschanged = null;
        try {
          isCancellingRef.current = true;
          synthesisRef.current.cancel();
        } catch (error) {
          console.error('Error canceling speech during cleanup:', error);
        }
      }
      utteranceQueueRef.current = [];
      currentUtteranceIndexRef.current = 0;
      console.log("Speech synthesis cleanup complete.");
    };
  }, [initializeSpeechSynthesis]); // Dependency is correct

  // Function to process text before speaking (remains the same)
  const processTextForSpeech = (text: string): string => {
    let processedText = text.replace(/#{1,}/g, ' ');
    processedText = processedText.replace(/---+/g, ' ');
    processedText = processedText.replace(/\*\*\*/g, ' ');
    processedText = processedText.replace(/\.\.\./g, '.'); // Replace ellipsis with period for splitting
    processedText = processedText.replace(/<[^>]+>/g, ' '); // Remove HTML tags
    processedText = processedText.replace(/[*_~`]/g, ' '); // Remove markdown emphasis
    processedText = processedText.replace(/\s+/g, ' ').trim(); // Normalize whitespace
    return processedText;
  };

  // Function to split text into chunks (sentences)
  const splitIntoSentences = (text: string): string[] => {
      const sentences = text.match(/[^.!?]+[.!?]?\s*/g);
      return sentences ? sentences.map(s => s.trim()).filter(s => s.length > 0) : [text];
  };


  // Function to speak the next chunk in the queue
  const speakNextChunk = useCallback(() => {
    if (isCancellingRef.current) {
        console.log("SpeakNextChunk: Cancellation in progress, stopping.");
        setIsSpeaking(false);
        return;
    }

    if (!synthesisRef.current || currentUtteranceIndexRef.current >= utteranceQueueRef.current.length) {
      console.log('SpeakNextChunk: Queue finished or synthesis not available.');
      setIsSpeaking(false);
      utteranceQueueRef.current = [];
      currentUtteranceIndexRef.current = 0;
      return;
    }

    const utterance = utteranceQueueRef.current[currentUtteranceIndexRef.current];
    console.log(`SpeakNextChunk: Speaking chunk ${currentUtteranceIndexRef.current + 1}/${utteranceQueueRef.current.length}: "${utterance.text.substring(0, 50)}..."`);

    utterance.onend = () => {
      console.log(`SpeakNextChunk: Chunk ${currentUtteranceIndexRef.current + 1} ended.`);
      if (isCancellingRef.current) {
          console.log("SpeakNextChunk (onend): Cancellation detected, stopping.");
          setIsSpeaking(false);
          return;
      }
      currentUtteranceIndexRef.current++;
      setTimeout(speakNextChunk, 50);
    };

    utterance.onerror = (event) => {
      console.error(`SpeakNextChunk: Error on chunk ${currentUtteranceIndexRef.current + 1}:`, event.error, `Text: "${event.utterance?.text?.substring(0, 100)}..."`);
       if (isCancellingRef.current) {
          console.log("SpeakNextChunk (onerror): Cancellation detected, stopping.");
          setIsSpeaking(false);
          return;
      }
      setIsSpeaking(false);
      utteranceQueueRef.current = [];
      currentUtteranceIndexRef.current = 0;
    };

    utterance.onstart = () => {
        console.log(`SpeakNextChunk: Chunk ${currentUtteranceIndexRef.current + 1} started.`);
        setIsSpeaking(true);
    };

    try {
        if (currentUtteranceIndexRef.current === 0) {
            utterance.text = AUDIBLE_PREFIX + utterance.text;
        }
        synthesisRef.current.speak(utterance);
    } catch (error) {
        console.error('SpeakNextChunk: Error calling synthesis.speak:', error);
        setIsSpeaking(false);
        utteranceQueueRef.current = [];
        currentUtteranceIndexRef.current = 0;
    }
  }, []); // Dependencies managed internally via refs

  // Main speak function - initiates the chunking process
  const speak = useCallback((text: string) => {
    if (!text || text.trim().length === 0) {
      console.warn("Speak called with empty text. Ignoring.");
      return;
    }
    // Check voicesLoadedRef instead of voicesLoadedState
    if (!synthesisRef.current || !isInitializedRef.current || !voicesLoadedRef.current || !selectedVoiceRef.current) {
      console.warn('Speak called but synthesis/voices not ready. Cannot speak yet.');
      return;
    }

    isCancellingRef.current = true;
    console.log("Speak: Cancelling previous speech (if any)...");
    synthesisRef.current.cancel();

    setTimeout(() => {
        isCancellingRef.current = false;
        console.log("Speak: Proceeding with new speech.");

        const processedText = processTextForSpeech(text);
        const chunks = splitIntoSentences(processedText);

        if (chunks.length === 0) {
            console.warn("Speak: No text chunks generated after processing.");
            return;
        }

        console.log(`Speak: Creating ${chunks.length} utterance chunks.`);
        utteranceQueueRef.current = chunks.map((chunk) => {
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.voice = selectedVoiceRef.current;
            utterance.lang = selectedVoiceRef.current?.lang || 'fr-FR';
            utterance.rate = 1.0;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;
            return utterance;
        });

        currentUtteranceIndexRef.current = 0;
        setIsSpeaking(true);
        speakNextChunk();

    }, 100);

  }, [speakNextChunk]); // speakNextChunk is stable

  // Cancel function - stops the current chunk and clears the queue
  const cancel = useCallback(() => {
    if (!synthesisRef.current || !isSpeaking) {
        return;
    }
    console.log("Cancel: Initiating cancellation.");
    isCancellingRef.current = true;

    utteranceQueueRef.current = [];
    currentUtteranceIndexRef.current = 0;

    try {
        synthesisRef.current.cancel();
        console.log("Cancel: synthesis.cancel() called.");
    } catch (error) {
        console.error('Cancel: Error calling synthesis.cancel():', error);
    } finally {
        setIsSpeaking(false);
        setTimeout(() => {
            isCancellingRef.current = false;
            console.log("Cancel: Cancellation flag reset.");
        }, 50);
    }
  }, [isSpeaking]); // Depends on isSpeaking state

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
  };
};
