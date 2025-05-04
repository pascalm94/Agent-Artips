import React from 'react';
import { VoiceOption } from '../types';

interface VoiceSelectorProps {
  voiceOptions: VoiceOption[];
  selectedVoiceId: string | null;
  onVoiceChange: (voiceId: string) => void;
  isSupported: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voiceOptions,
  selectedVoiceId,
  onVoiceChange,
  isSupported
}) => {
  if (!isSupported || voiceOptions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="voice-select" className="text-sm font-medium text-gray-700">
        Voix:
      </label>
      <select
        id="voice-select"
        value={selectedVoiceId || ''}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        {voiceOptions.map((voice) => {
          // Add provider info to the display name
          const providerTag = voice.provider ? `[${voice.provider}]` : '';
          return (
            <option key={voice.id} value={voice.id}>
              {voice.name} {providerTag} ({voice.gender === 'female' ? 'F' : voice.gender === 'male' ? 'M' : '?'})
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default VoiceSelector;
