"use client";

import type { IncompleteChat } from "@/types/instagram";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Users, User } from "lucide-react";
import ThemeToggle from "./theme-toggle";

interface ChatListScreenProps {
  chats: IncompleteChat[];
  onSelectChat: (chat: IncompleteChat) => void;
  onClearData: () => void;
}

export default function ChatListScreen({ chats, onSelectChat, onClearData }: ChatListScreenProps) {
  const sortedChats = [...chats].sort((a, b) => {
    return (b.lastActivity || 0) - (a.lastActivity || 0);
  });

  const getParticipantCount = (chat: IncompleteChat) => chat.participants.length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex-shrink-0 border-b bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-semibold">Your Conversations</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="destructive" size="icon" onClick={onClearData} aria-label="Clear all data">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-grow bg-background">
        <div className="mx-auto max-w-3xl space-y-3 p-3 sm:p-4">
          {sortedChats.map((chat) => {
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
                  {chat.lastActivity ? (
                     <p className="text-xs text-muted-foreground">
                        Last message on {format(new Date(chat.lastActivity), "MMMM d, yyyy")}
                      </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No recent activity found.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
