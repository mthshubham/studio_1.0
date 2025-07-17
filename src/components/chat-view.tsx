"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { InstagramChat, InstagramMessage } from "@/types/instagram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CalendarDays, X, Trash2, ArrowLeft, ArrowDown, ArrowUp } from "lucide-react";
import MessageBubble from "./message-bubble";
import DateSeparator from "./date-separator";
import ThemeToggle from "./theme-toggle";
import { useVirtualizer } from "@tanstack/react-virtual";


interface ChatViewProps {
  chatData: InstagramChat;
  onClearData: () => void;
  onBack: () => void;
  onLoadMore: () => Promise<void>;
}

type GroupedMessage = { type: 'date'; date: string, id: string } | { type: 'message'; message: InstagramMessage, id: string };

export default function ChatView({ chatData, onClearData, onBack, onLoadMore }: ChatViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [owner, setOwner] = useState<string>("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const hasMoreMessages = (chatData.loadedFileIndex ?? 0) < chatData.message_files.length - 1;

  useEffect(() => {
    if (chatData.participants.length > 0) {
      setOwner(chatData.participants[0].name);
    }
  }, [chatData.participants]);
  
  const { groupedMessages, dateJumpMap } = useMemo(() => {
    const filtered = searchQuery
      ? chatData.messages.filter((msg) => msg.content?.toLowerCase().includes(searchQuery.toLowerCase()))
      : chatData.messages;

    if (filtered.length === 0) {
      return { groupedMessages: [], dateJumpMap: new Map() };
    }
    
    const groups: GroupedMessage[] = [];
    const dateMap = new Map<string, number>();
    let lastDate: string | null = null;

    for (let i = 0; i < filtered.length; i++) {
        const message = filtered[i];
        const messageDate = new Date(message.timestamp_ms).toDateString();
        if (messageDate !== lastDate) {
            const dateId = `date-${messageDate}`;
            groups.push({ type: "date", date: messageDate, id: dateId });
            dateMap.set(messageDate, groups.length - 1);
            lastDate = messageDate;
        }
        groups.push({ type: "message", message: message, id: `msg-${message.timestamp_ms}-${i}` });
    }

    return { groupedMessages: groups, dateJumpMap: dateMap };
  }, [chatData.messages, searchQuery]);
  
  const rowVirtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize: useCallback((index: number) => {
        const item = groupedMessages[index];
        if (item.type === 'date') return 48;
        
        const { content } = item.message;
        const baseHeight = 60;
        const charsPerLine = 50;
        const lineHeight = 20;
        const lines = content ? Math.ceil(content.length / charsPerLine) : 1;
        return baseHeight + (lines * lineHeight);
    }, [groupedMessages]),
    overscan: 20,
  });

  const previousMessageCount = useRef(chatData.messages.length);

  useEffect(() => {
    const newMessagesCount = chatData.messages.length - previousMessageCount.current;
    
    if (newMessagesCount > 0) {
      // If messages were prepended, scroll to maintain position
      const previousScrollOffset = rowVirtualizer.getTotalSize();
      
      rowVirtualizer.measure();
      const newScrollOffset = rowVirtualizer.getTotalSize();

      if(scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop += (newScrollOffset - previousScrollOffset);
      }
      
    } else if (groupedMessages.length > 0 && !searchQuery) {
        // Initial load, scroll to bottom
        rowVirtualizer.scrollToIndex(groupedMessages.length - 1, { align: 'end', behavior: 'auto' });
    }
    previousMessageCount.current = chatData.messages.length;

  }, [chatData.messages.length, groupedMessages.length, rowVirtualizer, searchQuery]);


  const handleScroll = () => {
    if (!scrollViewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollToBottom(!isAtBottom);

    const atTop = scrollTop < 50;
    setIsAtTop(atTop);
  }

  useEffect(() => {
    const scrollEl = scrollViewportRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleDateJump = (date: Date | undefined) => {
    setSelectedDate(date);
    if (!date) return;
  
    const dateString = date.toDateString();
    let targetIndex = dateJumpMap.get(dateString);

    if (targetIndex === undefined) {
      // Find closest date if exact not found
      let closestDate = new Date();
      let minDiff = Infinity;
      dateJumpMap.forEach((_v, k) => {
        const d = new Date(k);
        const diff = Math.abs(d.getTime() - date.getTime());
        if(diff < minDiff){
          minDiff = diff;
          closestDate = d;
        }
      });
      targetIndex = dateJumpMap.get(closestDate.toDateString());
    }
    
    if (targetIndex !== undefined) {
        rowVirtualizer.scrollToIndex(targetIndex, { align: 'start', behavior: 'smooth' });
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    await onLoadMore();
    setIsLoadingMore(false);
  }

  const scrollToBottom = () => {
    rowVirtualizer.scrollToIndex(groupedMessages.length - 1, { align: 'end', behavior: 'smooth' });
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }

  const clearSearch = () => setSearchQuery("");
  
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const msg of chatData.messages) {
        dates.add(new Date(msg.timestamp_ms).toDateString());
    }
    return Array.from(dates).map(d => new Date(d));
  }, [chatData.messages])

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
                    disabled={(date) => !availableDates.some(d => d.toDateString() === date.toDateString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <ThemeToggle />
              <Button variant="destructive" size="icon" onClick={onClearData}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </header>
      
      <div className="flex-grow relative overflow-hidden">
        <ScrollArea className="absolute inset-0" viewportRef={scrollViewportRef}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            
            {isAtTop && hasMoreMessages && (
                <div className="flex justify-center p-4">
                    <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        {isLoadingMore ? "Loading..." : "Load Older Messages"}
                    </Button>
                </div>
            )}
            
            {groupedMessages.length > 0 ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = groupedMessages[virtualRow.index];
                if (!item) return null;
                
                const content = item.type === 'date' ? (
                    <DateSeparator key={item.id} date={item.date} />
                ) : (
                    <MessageBubble 
                        key={item.id}
                        message={item.message}
                        isOwner={item.message.sender_name === owner}
                        searchQuery={searchQuery}
                    />
                );

                return (
                    <div
                        key={item.id}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="px-3 sm:px-4 mx-auto max-w-5xl"
                    >
                       {content}
                    </div>
                )
                })
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p className="font-semibold text-lg">No messages found</p>
                    <p>{searchQuery ? "Try a different search term." : "Your chat appears to be empty."}</p>
                </div>
            )}
            </div>
        </ScrollArea>

        {showScrollToBottom && (
            <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 rounded-full h-12 w-12 shadow-lg z-10"
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
            >
                <ArrowDown className="h-6 w-6"/>
            </Button>
        )}
      </div>

       <Button variant="outline" onClick={onBack} className="sm:hidden m-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chats
       </Button>
    </div>
  );
}
