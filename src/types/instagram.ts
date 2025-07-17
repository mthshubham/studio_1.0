export interface InstagramMessage {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  photos?: { uri: string }[];
  videos?: { uri:string }[];
  audio_files?: { uri: string }[];
  reactions?: { reaction: string; actor: string }[];
  share?: { link: string };
  call_duration?: number;
}

export interface InstagramParticipant {
  name: string;
}

// Base chat structure used for the chat list
export interface IncompleteChat {
  participants: InstagramParticipant[];
  title: string;
  is_still_participant: boolean;
  thread_type: string;
  thread_path: string;
  message_files: string[];
  lastActivity?: number;
}

// Full chat structure with all messages, used for the chat view
export interface InstagramChat extends IncompleteChat {
  messages: InstagramMessage[];
}
