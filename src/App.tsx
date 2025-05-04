import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ConversationHistory from './components/ConversationHistory';
import ErrorMessage from './components/ErrorMessage';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { sendMessageToWebhook } from './services/api';
import { Message, Conversation, ConversationState } from './types';

// Polyfill for UUID
const generateId = () => {
  try {
    return uuidv4();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
};

function App() {
  const [state, setState] = useState<ConversationState>({
    currentConversationId: generateId(),
    conversations: [{
      id: generateId(),
      title: '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    isRecording: false,
    isProcessing: false,
    error: null,
    selectedVoiceId: null
  });

  // Load conversation history from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('artips-conversations');
    const savedCurrentId = localStorage.getItem('artips-current-conversation-id');
    
    if (savedConversations) {
      try {
        const parsedConversations = JSON.parse(savedConversations);
        
        // Ensure timestamps are Date objects
        const conversations = parsedConversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        // If we have a saved current ID and it exists in the conversations
        let currentId = state.currentConversationId;
        if (savedCurrentId && conversations.some((c: Conversation) => c.id === savedCurrentId)) {
          currentId = savedCurrentId;
        } else if (conversations.length > 0) {
          // Otherwise use the most recent conversation
          currentId = conversations[0].id;
        }
        
        setState(prev => ({ 
          ...prev, 
          conversations,
          currentConversationId: currentId
        }));
      } catch (error) {
        console.error('Failed to parse saved conversations:', error);
      }
    }
  }, []);

  // Save conversation history to localStorage
  useEffect(() => {
    if (state.conversations.length > 0) {
      localStorage.setItem('artips-conversations', JSON.stringify(state.conversations));
      localStorage.setItem('artips-current-conversation-id', state.currentConversationId);
    }
  }, [state.conversations, state.currentConversationId]);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const { 
    speak, 
    cancel: stopSpeaking, 
    isSpeaking, 
    isSupported: isSpeechSynthesisSupported
  } = useSpeechSynthesis();

  // Get current conversation
  const currentConversation = state.conversations.find(
    c => c.id === state.currentConversationId
  ) || {
    id: state.currentConversationId,
    title: '',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Update a conversation in the state
  const updateConversation = useCallback((updatedConversation: Conversation) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(c => 
        c.id === updatedConversation.id ? updatedConversation : c
      )
    }));
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      text,
      isUser: true,
      timestamp: new Date()
    };
    
    // Update current conversation with the new message
    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      updatedAt: new Date()
    };
    
    // Set title if this is the first message
    if (currentConversation.messages.length === 0 && !currentConversation.title) {
      updatedConversation.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    
    // Update state
    updateConversation(updatedConversation);
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Stop any ongoing speech before sending a new message
      if (isSpeaking) {
        stopSpeaking();
      }
      
      // Send to webhook
      const response = await sendMessageToWebhook(text);
      
      // Add agent response
      const agentMessage: Message = {
        id: generateId(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };
      
      // Update conversation with agent response
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, agentMessage],
        updatedAt: new Date()
      };
      
      updateConversation(finalConversation);
      setState(prev => ({ ...prev, isProcessing: false }));
      
      // Speak the response
      if (isSpeechSynthesisSupported) {
        speak(response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to get a response. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('HTTP error! Status: 4')) {
          errorMessage = 'Server error: The request was rejected. Please try again later.';
        } else if (error.message.includes('HTTP error! Status: 5')) {
          errorMessage = 'Server error: The server is currently unavailable. Please try again later.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
    }
  }, [currentConversation, updateConversation, speak, stopSpeaking, isSpeaking, isSpeechSynthesisSupported]);

  // Define handleSpeechResult after handleSendMessage is defined
  const handleSpeechResult = useCallback((transcript: string) => {
    if (transcript.trim()) {
      handleSendMessage(transcript);
    }
  }, [handleSendMessage]);

  // Handle speech recognition errors
  const handleSpeechError = useCallback((error: string) => {
    setError(error);
    setState(prev => ({ ...prev, isRecording: false }));
  }, [setError]);

  // Initialize speech recognition after handleSpeechResult is defined
  const { 
    isRecording,
    startRecording, 
    stopRecording,
    isSupported: isSpeechRecognitionSupported
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onError: handleSpeechError
  });

  // Update state when isRecording changes
  useEffect(() => {
    setState(prev => ({ ...prev, isRecording }));
  }, [isRecording]);

  const handleReplayAudio = useCallback((message: Message) => {
    if (isSpeechSynthesisSupported && !message.isUser) {
      // Stop any ongoing speech before playing a new one
      if (isSpeaking) {
        stopSpeaking();
      }
      speak(message.text);
    }
  }, [speak, stopSpeaking, isSpeaking, isSpeechSynthesisSupported]);

  const handleStopAudio = useCallback(() => {
    if (isSpeechSynthesisSupported && isSpeaking) {
      stopSpeaking();
    }
  }, [stopSpeaking, isSpeaking, isSpeechSynthesisSupported]);

  const handleClearHistory = useCallback(() => {
    const confirmed = window.confirm('Are you sure you want to clear all conversation history? This cannot be undone.');
    if (confirmed) {
      const newConversationId = generateId();
      setState(prev => ({ 
        ...prev, 
        conversations: [{
          id: newConversationId,
          title: '',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        currentConversationId: newConversationId
      }));
      localStorage.removeItem('artips-conversations');
      localStorage.removeItem('artips-current-conversation-id');
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    const newConversationId = generateId();
    const newConversation = {
      id: newConversationId,
      title: '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setState(prev => ({ 
      ...prev, 
      conversations: [newConversation, ...prev.conversations],
      currentConversationId: newConversationId
    }));
  }, []);

  const handleLoadConversation = useCallback((conversationId: string) => {
    setState(prev => ({ ...prev, currentConversationId: conversationId }));
  }, []);

  // Add a test function to check if the webhook is reachable
  const testWebhookConnection = useCallback(async () => {
    try {
      const response = await fetch('https://n8n.aidoption.fr/webhook/Artips', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      console.log('Webhook connection test:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      return response.ok;
    } catch (error) {
      console.error('Webhook connection test failed:', error);
      return false;
    }
  }, []);

  // Test the webhook connection on mount
  useEffect(() => {
    testWebhookConnection();
  }, [testWebhookConnection]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 flex gap-4 max-w-6xl">
        {/* Conversation History Sidebar */}
        <div className="w-80 hidden md:block">
          <ConversationHistory 
            conversations={state.conversations}
            currentConversationId={state.currentConversationId}
            onReplayAudio={handleReplayAudio}
            onClearHistory={handleClearHistory}
            onNewConversation={handleNewConversation}
            onLoadConversation={handleLoadConversation}
          />
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col gap-4">
          {state.error && (
            <ErrorMessage 
              message={state.error} 
              onDismiss={() => setError(null)} 
            />
          )}
          
          <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="font-medium">
                  {currentConversation.title || 'New Conversation'}
                </h2>
              </div>
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors text-sm md:hidden"
                title="Start a new conversation"
              >
                <span>New Conversation</span>
              </button>
            </div>
            
            <MessageList 
              messages={currentConversation.messages} 
              onReplayAudio={handleReplayAudio}
              onStopAudio={handleStopAudio}
              isProcessing={state.isProcessing}
              isSpeaking={isSpeaking}
            />
            
            <div className="p-4 border-t">
              <MessageInput 
                onSendMessage={handleSendMessage}
                isRecording={state.isRecording}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                isProcessing={state.isProcessing}
                isSpeechRecognitionSupported={isSpeechRecognitionSupported}
              />
            </div>
          </div>
          
          {/* Mobile Conversation History (shown only on small screens) */}
          <div className="md:hidden">
            <ConversationHistory 
              conversations={state.conversations}
              currentConversationId={state.currentConversationId}
              onReplayAudio={handleReplayAudio}
              onClearHistory={handleClearHistory}
              onNewConversation={handleNewConversation}
              onLoadConversation={handleLoadConversation}
            />
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white text-center py-3 text-sm">
        <p>Agent Artips &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
