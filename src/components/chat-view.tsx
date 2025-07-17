"use client";

import { useMemo, useState, useRef, createRef, useEffect } from "react";
import type { InstagramChat, InstagramMessage } from "@/types/instagram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CalendarDays, X, Trash2, ArrowLeft } from "lucide-react";
import MessageBubble from "./message-bubble";
import DateSeparator from "./date-separator";

interface ChatViewProps {
  chatData: InstagramChat;
  onClearData: () => void;
  onBack: () => void;
}

type GroupedMessage = { type: 'date'; date: string } | { type: 'message'; message: InstagramMessage, index: number };

export default function ChatView({ chatData, onClearData, onBack }: ChatViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [owner, setOwner] = useState<string>("");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const dateHeaderRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    // Assuming the first participant is the owner of the exported data.
    if (chatData.participants.length > 0) {
      setOwner(chatData.participants[0].name);
    }
  }, [chatData.participants]);
  
  // Assign refs
  messageRefs.current = useMemo(() => 
    Array(chatData.messages.length).fill(null).map((_, i) => messageRefs.current[i] || createRef<HTMLDivElement>())
  , [chatData.messages.length]);


  const { groupedMessages, availableDates } = useMemo(() => {
    const filtered = chatData.messages.filter(
      (msg) =>
        msg.content &&
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const availableDates = new Set(chatData.messages.map(msg => new Date(msg.timestamp_ms).toDateString()));

    if (filtered.length === 0) {
      return { groupedMessages: [], availableDates };
    }
    
    const messagesWithOriginalIndex = filtered.map(message => ({
      ...message,
      originalIndex: chatData.messages.findIndex(m => m.timestamp_ms === message.timestamp_ms && m.sender_name === m.sender_name)
    }));


    const groups: GroupedMessage[] = [];
    let lastDate: string | null = null;

    messagesWithOriginalIndex.forEach((message) => {
      const messageDate = new Date(message.timestamp_ms).toDateString();
      if (messageDate !== lastDate) {
        groups.push({ type: "date", date: messageDate });
        lastDate = messageDate;
      }
      groups.push({ type: "message", message: message, index: message.originalIndex });
    });

    return { groupedMessages: groups, availableDates };
  }, [chatData.messages, searchQuery]);

  const handleDateJump = (date: Date | undefined) => {
    setSelectedDate(date);
    if (!date) return;
  
    const dateString = date.toDateString();
    const targetRef = dateHeaderRefs.current.get(dateString);
  
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }

  const clearSearch = () => setSearchQuery("");

  const disabledDays = (date: Date) => {
    return !availableDates.has(date.toDateString());
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex-shrink-0 border-b bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onBack} className="hidden sm:inline-flex">
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold truncate" title={chatData.title}>{chatData.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search messages..." value={searchQuery} onChange={handleSearchChange} className="pl-9" />
                {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={clearSearch}><X className="h-4 w-4" /></Button>}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateJump}
                    disabled={disabledDays}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="destructive" size="icon" onClick={onClearData}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </header>

      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
          {groupedMessages.length > 0 ? (
            groupedMessages.map((item, idx) => {
              if (item.type === 'date') {
                return <DateSeparator key={`${item.date}-${idx}`} date={item.date} ref={(el) => dateHeaderRefs.current.set(item.date, el)} />;
              }
              return (
                <MessageBubble 
                    key={`${item.message.timestamp_ms}-${item.index}`}
                    ref={messageRefs.current[item.index]}
                    message={item.message}
                    isOwner={item.message.sender_name === owner}
                    searchQuery={searchQuery}
                />
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="font-semibold text-lg">No messages found</p>
                <p>{searchQuery ? "Try a different search term." : "Your chat appears to be empty."}</p>
            </div>
          )}
        </div>
      </ScrollArea>
       <Button variant="outline" onClick={onBack} className="sm:hidden m-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chats
       </Button>
    </div>
  );
}
