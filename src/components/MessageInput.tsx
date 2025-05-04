import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isProcessing: boolean;
  isSpeechRecognitionSupported: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isRecording,
  onStartRecording,
  onStopRecording,
  isProcessing,
  isSpeechRecognitionSupported
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32"
          rows={1}
          disabled={isProcessing}
        />
        {isRecording && (
          <div className="absolute right-3 bottom-2 text-red-500 animate-pulse">
            <Mic size={20} />
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        {isSpeechRecognitionSupported && (
          <button
            type="button"
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isProcessing}
            className={`p-2 rounded-full ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
        
        <button
          type="submit"
          disabled={!message.trim() || isProcessing}
          className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          {isProcessing ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
