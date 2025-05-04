import React from 'react';
import { Brain } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain size={28} className="text-white" />
          <h1 className="text-xl font-bold">Agent Artips</h1>
        </div>
        <div className="text-sm opacity-80">Your AI Conversation Assistant</div>
      </div>
    </header>
  );
};

export default Header;
