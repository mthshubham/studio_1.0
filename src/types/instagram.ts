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

export interface InstagramChat {
  participants: InstagramParticipant[];
  messages: InstagramMessage[];
  title: string;
  is_still_participant: boolean;
  thread_type: string;
  thread_path: string;
}
