import React, { useRef, useEffect } from 'react';
import { User, Bot, Volume2, VolumeX, Loader } from 'lucide-react';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  onReplayAudio: (message: Message) => void;
  onStopAudio?: () => void;
  isProcessing: boolean;
  isSpeaking: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  onReplayAudio, 
  onStopAudio,
  isProcessing,
  isSpeaking
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to format message text with proper line breaks
  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <Bot size={48} className="mb-4 text-indigo-400" />
        <p className="text-lg font-medium">Start a conversation with Agent Artips</p>
        <p className="text-sm">Type a message or use the microphone to speak</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              message.isUser
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`rounded-full p-1 ${message.isUser ? 'bg-indigo-700' : 'bg-gray-200'}`}>
                {message.isUser ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-indigo-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="whitespace-pre-wrap break-words">
                  {formatMessageText(message.text)}
                </p>
                <div className="mt-1 flex justify-between items-center">
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {!message.isUser && (
                    <div>
                      {isSpeaking && !message.isUser ? (
                        <button
                          onClick={onStopAudio}
                          className={`p-1 rounded-full ${
                            message.isUser ? 'text-indigo-300 hover:text-white' : 'text-red-500 hover:text-red-600'
                          }`}
                          title="Stop audio"
                        >
                          <VolumeX size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onReplayAudio(message)}
                          className={`p-1 rounded-full ${
                            message.isUser ? 'text-indigo-300 hover:text-white' : 'text-gray-500 hover:text-indigo-600'
                          }`}
                          title="Play audio"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {isProcessing && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-tl-none">
            <div className="flex items-center gap-2">
              <div className="rounded-full p-1 bg-gray-200">
                <Bot size={16} className="text-indigo-600" />
              </div>
              <div className="flex items-center">
                <Loader size={16} className="animate-spin mr-2" />
                <span>Processing...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
