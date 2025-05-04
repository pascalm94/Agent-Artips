import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  if (!message) return null;
  
  return (
    <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start justify-between">
      <div className="flex items-center">
        <AlertCircle size={20} className="mr-2 flex-shrink-0" />
        <p>{message}</p>
      </div>
      <button 
        onClick={onDismiss}
        className="ml-4 text-red-500 hover:text-red-700"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default ErrorMessage;
