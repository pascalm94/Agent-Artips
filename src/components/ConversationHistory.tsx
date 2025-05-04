import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Volume2, Trash2, MessageSquare, Clock, Plus } from 'lucide-react';
import { Conversation, Message } from '../types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId: string;
  onReplayAudio: (message: Message) => void;
  onClearHistory: () => void;
  onNewConversation: () => void;
  onLoadConversation: (conversationId: string) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ 
  conversations = [], // Provide default empty array to prevent undefined
  currentConversationId,
  onReplayAudio,
  onClearHistory,
  onNewConversation,
  onLoadConversation
}) => {
  const [expandedConversations, setExpandedConversations] = useState<Record<string, boolean>>({});

  // Ensure conversations is an array
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  if (safeConversations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center justify-center h-full">
        <MessageSquare size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">No conversation history yet</p>
        <button
          onClick={onNewConversation}
          className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          <span>New Conversation</span>
        </button>
      </div>
    );
  }

  const toggleConversation = (conversationId: string) => {
    setExpandedConversations(prev => ({
      ...prev,
      [conversationId]: !prev[conversationId]
    }));
  };

  // Get the first user message as the title, or a default title
  const getConversationTitle = (conversation: Conversation) => {
    if (!conversation) return "Untitled Conversation";
    
    if (conversation.title) return conversation.title;
    
    // Ensure messages is an array
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    
    const firstUserMessage = messages.find(m => m.isUser);
    if (firstUserMessage) {
      const text = firstUserMessage.text;
      return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    
    // Ensure createdAt is a valid date
    const createdAt = conversation.createdAt instanceof Date ? 
      conversation.createdAt : new Date();
      
    return `Conversation ${createdAt.toLocaleDateString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="font-medium">Conversations</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors text-sm"
            title="Start a new conversation"
          >
            <Plus size={14} />
            <span>New</span>
          </button>
          <button
            onClick={onClearHistory}
            className="text-red-500 hover:text-red-700 p-1"
            title="Clear all history"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {safeConversations.map((conversation) => (
          <div key={conversation.id} className="border-b last:border-b-0">
            <button
              onClick={() => toggleConversation(conversation.id)}
              className={`w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors text-left ${
                currentConversationId === conversation.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex-1 mr-2">
                <div className="font-medium text-sm truncate">
                  {getConversationTitle(conversation)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {currentConversationId !== conversation.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadConversation(conversation.id);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 p-1 text-xs"
                    title="Load this conversation"
                  >
                    Load
                  </button>
                )}
                {expandedConversations[conversation.id] ? 
                  <ChevronUp size={16} /> : 
                  <ChevronDown size={16} />
                }
              </div>
            </button>
            
            {expandedConversations[conversation.id] && (
              <div className="p-3 space-y-2 bg-gray-50">
                {Array.isArray(conversation.messages) && conversation.messages.map(message => (
                  <div 
                    key={message.id}
                    className="p-2 rounded border border-gray-200 bg-white hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-medium">
                        {message.isUser ? 'You' : 'Agent Artips'}
                      </div>
                      <div className="text-xs text-gray-600 truncate max-w-[200px]">
                        {message.text}
                      </div>
                    </div>
                    {!message.isUser && (
                      <button
                        onClick={() => onReplayAudio(message)}
                        className="p-1 text-gray-500 hover:text-indigo-600"
                        title="Play audio"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationHistory;
