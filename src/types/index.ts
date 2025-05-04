export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationState {
  currentConversationId: string;
  conversations: Conversation[];
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  selectedVoiceId: string | null;
}

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'unknown';
  provider?: string;
  qualityScore: number;
}
