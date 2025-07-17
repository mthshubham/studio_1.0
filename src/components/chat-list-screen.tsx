"use client";

import type { InstagramChat } from "@/types/instagram";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Users, User, Info } from "lucide-react";
import ThemeToggle from "./theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatListScreenProps {
  chats: InstagramChat[];
  onSelectChat: (chat: InstagramChat) => void;
  onClearData: () => void;
}

export default function ChatListScreen({ chats, onSelectChat, onClearData }: ChatListScreenProps) {
  // Sorting is tricky without message content, so we'll sort by title for now.
  const sortedChats = [...chats].sort((a, b) => a.title.localeCompare(b.title));

  const getParticipantCount = (chat: InstagramChat) => chat.participants.length;

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

      <TooltipProvider>
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
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <MessageSquare className="mr-1.5 h-3 w-3" />
                        {chat.messageCount} messages
                      </div>
                       {chat.messageCount > 800 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-primary-foreground">
                                    <Info className="mr-1.5 h-3 w-3" />
                                    Large Chat
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>This chat will be loaded by month to improve performance.</p>
                            </TooltipContent>
                        </Tooltip>
                       )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </TooltipProvider>
    </div>
  );
}
