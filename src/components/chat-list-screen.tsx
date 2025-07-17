"use client";

import type { InstagramChat } from "@/types/instagram";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Users, User } from "lucide-react";

interface ChatListScreenProps {
  chats: InstagramChat[];
  onSelectChat: (chat: InstagramChat) => void;
  onClearData: () => void;
}

export default function ChatListScreen({ chats, onSelectChat, onClearData }: ChatListScreenProps) {
  const sortedChats = [...chats].sort((a, b) => {
    const lastMessageA = a.messages[a.messages.length - 1]?.timestamp_ms || 0;
    const lastMessageB = b.messages[b.messages.length - 1]?.timestamp_ms || 0;
    return lastMessageB - lastMessageA;
  });

  const getParticipantCount = (chat: InstagramChat) => chat.participants.length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex-shrink-0 border-b bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-semibold">Your Conversations</h1>
          <Button variant="destructive" size="icon" onClick={onClearData} aria-label="Clear all data">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-grow bg-background">
        <div className="mx-auto max-w-3xl space-y-3 p-3 sm:p-4">
          {sortedChats.map((chat) => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            const participantCount = getParticipantCount(chat);
            return (
              <Card
                key={chat.thread_path}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => onSelectChat(chat)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{chat.title}</span>
                    <div className="flex items-center text-sm font-medium text-muted-foreground">
                      {participantCount > 2 ? <Users className="mr-1.5 h-4 w-4" /> : <User className="mr-1.5 h-4 w-4" />}
                      {participantCount}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lastMessage ? (
                    <div className="space-y-1">
                      <p className="truncate text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{lastMessage.sender_name}:</span> {lastMessage.content || '[Media shared]'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last message on {format(new Date(lastMessage.timestamp_ms), "MMMM d, yyyy")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No messages in this chat.</p>
                  )}
                  <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <MessageSquare className="mr-1.5 h-3 w-3" />
                    {chat.messages.length} messages
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
