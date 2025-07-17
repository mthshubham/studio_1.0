"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { InstagramChat, InstagramMessage } from "@/types/instagram";
import type { LoadedInstagramChat } from "@/app/page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CalendarDays, X, Trash2, ArrowLeft, ChevronsDown, ChevronsUp, Info } from "lucide-react";
import MessageBubble from "./message-bubble";
import DateSeparator from "./date-separator";
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import ThemeToggle from "./theme-toggle";


interface ChatViewProps {
  chatData: LoadedInstagramChat;
  fullChat: InstagramChat; // This contains all metadata, like messageCount
  onClearData: () => void;
  onBack: () => void;
}

type GroupedMessage = { type: 'date'; date: string } | { type: 'message'; message: InstagramMessage };
type MonthOption = { label: string; year: number; month: number };

const PAGING_THRESHOLD = 800;

export default function ChatView({ chatData, fullChat, onClearData, onBack }: ChatViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [owner, setOwner] = useState<string>("");
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set());
  const [displayedMessages, setDisplayedMessages] = useState<InstagramMessage[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const dateHeaderRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const isPaged = fullChat.messageCount > PAGING_THRESHOLD;

  const monthOptions = useMemo(() => {
    if (!isPaged) return [];
    
    const months: MonthOption[] = [];
    chatData.messages.forEach(msg => {
      const date = new Date(msg.timestamp_ms);
      const year = getYear(date);
      const month = getMonth(date);
      const label = format(date, "MMMM yyyy");

      if (!months.some(m => m.year === year && m.month === month)) {
        months.push({ label, year, month });
      }
    });

    // Sort descending
    return months.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - b.month;
    });
  }, [chatData.messages, isPaged]);


  const toggleMonth = (month: MonthOption) => {
    const monthKey = `${month.year}-${month.month}`;
    const newLoadedMonths = new Set(loadedMonths);
    if (newLoadedMonths.has(monthKey)) {
        newLoadedMonths.delete(monthKey);
    } else {
        newLoadedMonths.add(monthKey);
    }
    setLoadedMonths(newLoadedMonths);
  };

  useEffect(() => {
    if (isPaged) {
        // Load most recent month initially
        if (monthOptions.length > 0 && loadedMonths.size === 0) {
            const mostRecentMonth = monthOptions[0];
            setLoadedMonths(new Set([`${mostRecentMonth.year}-${mostRecentMonth.month}`]));
        }
    } else {
        setDisplayedMessages(chatData.messages);
    }
  }, [isPaged, chatData.messages, monthOptions, loadedMonths]);

  useEffect(() => {
    if (isPaged) {
        const newMessages = chatData.messages.filter(msg => {
            const date = new Date(msg.timestamp_ms);
            const key = `${getYear(date)}-${getMonth(date)}`;
            return loadedMonths.has(key);
        });
        newMessages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        setDisplayedMessages(newMessages);
    }
  }, [loadedMonths, chatData.messages, isPaged]);


  useEffect(() => {
    if (chatData.participants.length > 0) {
      setOwner(chatData.participants[0].name);
    }
  }, [chatData.participants]);

  const { groupedMessages, availableDates } = useMemo(() => {
    const messagesToDisplay = displayedMessages.filter(
      (msg) =>
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const available = new Set(displayedMessages.map(msg => new Date(msg.timestamp_ms).toDateString()));

    if (messagesToDisplay.length === 0) {
      return { groupedMessages: [], availableDates: available };
    }
    
    const groups: GroupedMessage[] = [];
    let lastDate: string | null = null;

    messagesToDisplay.forEach((message) => {
      const messageDate = new Date(message.timestamp_ms).toDateString();
      if (messageDate !== lastDate) {
        groups.push({ type: "date", date: messageDate });
        lastDate = messageDate;
      }
      groups.push({ type: "message", message: message });
    });

    return { groupedMessages: groups, availableDates: available };
  }, [displayedMessages, searchQuery]);


  const rowVirtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = groupedMessages[index];
      if (item.type === 'date') return 48; // Date separator height
      // Estimate message height
      const charCount = item.message.content?.length || 20;
      const lines = Math.ceil(charCount / 50);
      return 60 + lines * 20; // Base height + lines
    },
    overscan: 10,
  });

  const handleDateJump = (date: Date | undefined) => {
    setSelectedDate(date);
    if (!date) return;
  
    const dateString = date.toDateString();
    
    // Find index in virtualized items
    const index = groupedMessages.findIndex(item => item.type === 'date' && item.date === dateString);
    if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: 'start' });
    }
  };

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
                <Input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
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
              <ThemeToggle />
              <Button variant="destructive" size="icon" onClick={onClearData}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </header>
      
      {isPaged && (
        <div className="flex-shrink-0 border-b bg-card p-2">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>This is a large chat. Showing messages from loaded months.</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowMonthSelector(!showMonthSelector)}>
                    {showMonthSelector ? "Hide Months" : "Load by Month"}
                    {showMonthSelector ? <ChevronsUp className="ml-2 h-4 w-4" /> : <ChevronsDown className="ml-2 h-4 w-4" />}
                </Button>
            </div>
            {showMonthSelector && (
            <div className="mx-auto max-w-5xl pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {monthOptions.map(month => (
                        <Button
                            key={month.label}
                            variant={loadedMonths.has(`${month.year}-${month.month}`) ? "default" : "outline"}
                            onClick={() => toggleMonth(month)}
                            className="w-full justify-start text-left"
                            size="sm"
                        >
                            {month.label}
                        </Button>
                    ))}
                </div>
            </div>
            )}
        </div>
      )}

      <div ref={parentRef} className="flex-grow overflow-y-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {groupedMessages.length > 0 ? (
            rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const item = groupedMessages[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="p-3 sm:p-4 mx-auto max-w-5xl"
                >
                  {item.type === 'date' ? (
                    <DateSeparator key={item.date} date={item.date} ref={(el) => dateHeaderRefs.current.set(item.date, el)} />
                  ) : (
                    <MessageBubble
                      key={`${item.message.timestamp_ms}-${item.message.sender_name}`}
                      message={item.message}
                      isOwner={item.message.sender_name !== owner}
                      searchQuery={searchQuery}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="font-semibold text-lg">No messages found</p>
                <p>{searchQuery ? "Try a different search term." : "Your chat appears to be empty or no months are loaded."}</p>
            </div>
          )}
        </div>
      </div>
       <Button variant="outline" onClick={onBack} className="sm:hidden m-4 flex-shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chats
       </Button>
    </div>
  );
}
